package com.foodsy.service;

import com.foodsy.domain.*;
import com.foodsy.dto.EventRestaurantWithPhotosDto;
import com.foodsy.repository.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.stream.Collectors;



@Service
@Transactional
public class EventSessionService {

    private final SessionRepository sessionRepository;
    private final EventSessionRestaurantRepository eventRestaurantRepo;
    private final EventRsvpRepository rsvpRepo;
    private final SessionParticipantRepository participantRepo;
    private final RestaurantCacheRepository restaurantCacheRepository;
    private final SessionRestaurantRepository sessionRestaurantRepository;

    public EventSessionService(SessionRepository sessionRepository,
                               EventSessionRestaurantRepository eventRestaurantRepo,
                               EventRsvpRepository rsvpRepo,
                               SessionParticipantRepository participantRepo,
                               RestaurantCacheRepository restaurantCacheRepository,
                               SessionRestaurantRepository sessionRestaurantRepository) {
        this.sessionRepository = sessionRepository;
        this.eventRestaurantRepo = eventRestaurantRepo;
        this.rsvpRepo = rsvpRepo;
        this.participantRepo = participantRepo;
        this.restaurantCacheRepository = restaurantCacheRepository;
        this.sessionRestaurantRepository = sessionRestaurantRepository;
    }

    public EventSessionRestaurant addRestaurant(Long sessionId, String creatorId, EventSessionRestaurant restaurant) {
        Session session = getSessionAsCreator(sessionId, creatorId);
        if (!"EVENT".equals(session.getSessionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not an event session");
        }

        int count = eventRestaurantRepo.countBySessionId(sessionId);
        if (count >= 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Maximum 6 restaurants allowed");
        }

        if (eventRestaurantRepo.findBySessionIdAndProviderId(sessionId, restaurant.getProviderId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Restaurant already added");
        }

        restaurant.setSessionId(sessionId);
        restaurant.setDisplayOrder(count + 1);
        return eventRestaurantRepo.save(restaurant);
    }

    public void removeRestaurant(Long sessionId, String creatorId, String providerId) {
        getSessionAsCreator(sessionId, creatorId);
        eventRestaurantRepo.deleteBySessionIdAndProviderId(sessionId, providerId);
    }

    public List<EventSessionRestaurant> getRestaurants(Long sessionId) {
        return eventRestaurantRepo.findBySessionIdOrderByDisplayOrder(sessionId);
    }

    public List<EventRestaurantWithPhotosDto> getRestaurantsWithPhotos(Long sessionId) {
        List<EventSessionRestaurant> restaurants = eventRestaurantRepo.findBySessionIdOrderByDisplayOrder(sessionId);
        if (restaurants.isEmpty()) return List.of();

        List<String> providerIds = restaurants.stream()
                .map(EventSessionRestaurant::getProviderId)
                .toList();
        Map<String, RestaurantCache> cacheByProviderId = restaurantCacheRepository
                .findByPlaceIdIn(providerIds)
                .stream()
                .collect(Collectors.toMap(RestaurantCache::getPlaceId, c -> c));

        return restaurants.stream()
                .map(r -> EventRestaurantWithPhotosDto.from(r, cacheByProviderId.get(r.getProviderId())))
                .toList();
    }

    public EventRsvp submitRsvp(Long sessionId, String userId, RsvpStatus status, String preferredProviderId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (!"EVENT".equals(session.getSessionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not an event session");
        }
        if (!"voting".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Session is not accepting RSVPs");
        }

        // Validate preference if Going/Maybe
        if ((status == RsvpStatus.GOING || status == RsvpStatus.MAYBE) && preferredProviderId != null) {
            eventRestaurantRepo.findBySessionIdAndProviderId(sessionId, preferredProviderId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Restaurant not in this event"));
        }

        // Upsert RSVP
        EventRsvp rsvp = rsvpRepo.findBySessionIdAndUserId(sessionId, userId)
                .orElseGet(() -> {
                    EventRsvp newRsvp = new EventRsvp();
                    newRsvp.setSessionId(sessionId);
                    newRsvp.setUserId(userId);
                    return newRsvp;
                });

        rsvp.setRsvpStatus(status);
        rsvp.setPreferredRestaurantId(status == RsvpStatus.NOT_GOING ? null : preferredProviderId);
        rsvp.setRespondedAt(Instant.now());
        rsvpRepo.save(rsvp);

        // Auto-join as participant if not already
        if (participantRepo.findBySessionIdAndUserId(sessionId, userId).isEmpty()) {
            SessionParticipant participant = new SessionParticipant();
            participant.setSession(session);
            participant.setUserId(userId);
            participant.setJoinedAt(Instant.now());
            participant.setVotingStatus("SUBMITTED");
            participantRepo.save(participant);
        } else {
            participantRepo.findBySessionIdAndUserId(sessionId, userId).ifPresent(p -> {
                p.setVotingStatus("SUBMITTED");
                participantRepo.save(p);
            });
        }

        // Auto-complete when all expected participants have responded
        Integer expectedParticipants = session.getExpectedParticipants();
        if (expectedParticipants != null && expectedParticipants >= 2) {
            long respondedCount = rsvpRepo.countBySessionId(sessionId);
            if (respondedCount >= expectedParticipants) {
                session.setStatus("ENDED");
                sessionRepository.save(session);
            }
        }

        return rsvp;
    }

    /**
     * Host locks in the restaurant list. Copies EventSessionRestaurant rows into
     * SessionRestaurant (round 1) and transitions the session to "voting".
     */
    public String lockRestaurants(Long sessionId, String creatorId) {
        Session session = getSessionAsCreator(sessionId, creatorId);
        if (!"EVENT".equals(session.getSessionType())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Not an event session");
        }
        if (!"setup".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Restaurants are already locked");
        }

        List<EventSessionRestaurant> eventRestaurants = eventRestaurantRepo.findBySessionIdOrderByDisplayOrder(sessionId);
        if (eventRestaurants.size() < 2) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Add at least 2 restaurants before locking");
        }

        // Copy into SessionRestaurant for the offline voting flow
        for (EventSessionRestaurant er : eventRestaurants) {
            SessionRestaurant sr = new SessionRestaurant();
            sr.setSessionId(sessionId);
            sr.setProviderId(er.getProviderId());
            sr.setName(er.getName());
            sr.setAddress(er.getAddress());
            sr.setCategory(er.getCategory());
            sr.setPriceLevel(er.getPriceLevel());
            sr.setRating(er.getRating());
            sr.setLikeCount(0);
            sr.setRound(1);
            sessionRestaurantRepository.save(sr);
        }

        session.setStatus("voting");
        sessionRepository.save(session);
        return session.getJoinCode();
    }

    public void completeEvent(Long sessionId, String creatorId) {
        Session session = getSessionAsCreator(sessionId, creatorId);
        session.setStatus("ENDED");
        sessionRepository.save(session);
    }

    public Map<String, Object> getEventSummary(Long sessionId) {
        List<EventRsvp> rsvps = rsvpRepo.findBySessionId(sessionId);
        List<EventSessionRestaurant> restaurants = eventRestaurantRepo.findBySessionIdOrderByDisplayOrder(sessionId);

        long goingCount = rsvps.stream().filter(r -> r.getRsvpStatus() == RsvpStatus.GOING).count();
        long maybeCount = rsvps.stream().filter(r -> r.getRsvpStatus() == RsvpStatus.MAYBE).count();
        long notGoingCount = rsvps.stream().filter(r -> r.getRsvpStatus() == RsvpStatus.NOT_GOING).count();

        // Count preferences among GOING + MAYBE
        Map<String, Long> preferenceCount = rsvps.stream()
                .filter(r -> r.getRsvpStatus() != RsvpStatus.NOT_GOING && r.getPreferredRestaurantId() != null)
                .collect(Collectors.groupingBy(EventRsvp::getPreferredRestaurantId, Collectors.counting()));

        // Find winner
        String winnerProviderId = preferenceCount.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElse(null);

        Map<String, String> restaurantNames = restaurants.stream()
                .collect(Collectors.toMap(EventSessionRestaurant::getProviderId, EventSessionRestaurant::getName));

        List<Map<String, Object>> restaurantVotes = restaurants.stream()
                .map(r -> Map.<String, Object>of(
                        "providerId", r.getProviderId(),
                        "name", r.getName(),
                        "votes", preferenceCount.getOrDefault(r.getProviderId(), 0L)
                ))
                .toList();

        List<Map<String, Object>> rsvpDetails = rsvps.stream()
                .map(r -> {
                    Map<String, Object> detail = new HashMap<>();
                    detail.put("userId", r.getUserId());
                    detail.put("rsvpStatus", r.getRsvpStatus().name());
                    detail.put("preferredRestaurantId", r.getPreferredRestaurantId());
                    detail.put("preferredRestaurantName",
                            r.getPreferredRestaurantId() != null ? restaurantNames.getOrDefault(r.getPreferredRestaurantId(), "") : null);
                    return detail;
                })
                .toList();

        Map<String, Object> result = new HashMap<>();
        result.put("goingCount", goingCount);
        result.put("maybeCount", maybeCount);
        result.put("notGoingCount", notGoingCount);
        result.put("totalResponses", rsvps.size());
        result.put("restaurantVotes", restaurantVotes);
        result.put("rsvps", rsvpDetails);
        result.put("winnerProviderId", winnerProviderId);
        result.put("winnerName", winnerProviderId != null ? restaurantNames.getOrDefault(winnerProviderId, "") : null);
        return result;
    }

    private Session getSessionAsCreator(Long sessionId, String creatorId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        String actual = session.getCreatorId() != null ? session.getCreatorId().trim().toLowerCase() : "";
        if (!actual.equals(creatorId.trim().toLowerCase())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the host can perform this action");
        }
        return session;
    }
}
