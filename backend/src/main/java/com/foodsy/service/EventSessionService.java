package com.foodsy.service;

import com.foodsy.domain.*;
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

    public EventSessionService(SessionRepository sessionRepository,
                               EventSessionRestaurantRepository eventRestaurantRepo,
                               EventRsvpRepository rsvpRepo,
                               SessionParticipantRepository participantRepo) {
        this.sessionRepository = sessionRepository;
        this.eventRestaurantRepo = eventRestaurantRepo;
        this.rsvpRepo = rsvpRepo;
        this.participantRepo = participantRepo;
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

        // Check if all participants have responded
        List<SessionParticipant> allParticipants = participantRepo.findBySessionId(sessionId);
        long respondedCount = rsvpRepo.countBySessionId(sessionId);
        if (respondedCount >= allParticipants.size() && allParticipants.size() >= 2) {
            session.setStatus("ENDED");
            sessionRepository.save(session);
        }

        return rsvp;
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
