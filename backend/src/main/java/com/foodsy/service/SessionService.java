package com.foodsy.service;

import com.foodsy.client.GooglePlacesClient;
import com.foodsy.domain.Session;
import com.foodsy.domain.SessionParticipant;
import com.foodsy.domain.SessionRestaurant;
import com.foodsy.dto.GooglePlacesSearchResponse;
import com.foodsy.dto.RestaurantDto;
import com.foodsy.example.session.JoinCodeGenerator;
import com.foodsy.repository.SessionParticipantRepository;
import com.foodsy.repository.SessionRepository;
import com.foodsy.repository.SessionRestaurantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Comparator;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository restaurantRepo;
    private final GooglePlacesClient placesClient;
    private final SessionParticipantRepository sessionParticipantRepository;

    public SessionService(SessionRepository sessionRepo, SessionRestaurantRepository restaurantRepo, GooglePlacesClient placesClient, SessionParticipantRepository sessionParticipantRepository) {
        this.sessionRepository = sessionRepo;
        this.restaurantRepo = restaurantRepo;
        this.placesClient = placesClient;
        this.sessionParticipantRepository = sessionParticipantRepository;
    }
    public Session createSession(Session session) {
        try {
            
            String code;
            do {
                code = JoinCodeGenerator.generate();
            } while (sessionRepository.findByJoinCode(code).isPresent());

            if (session.getCreatorId() == null || session.getPoolSize() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields: creatorId, poolSize");
            }

            session.setJoinCode(code);
            session.setStatus("OPEN");
            Session saved = sessionRepository.save(session);
            
            var response = placesClient.search("Astoria, NY", "restaurants");
            
            List<GooglePlacesSearchResponse.Place> places = new ArrayList<>(response.places());

            // Shuffle and limit
            Collections.shuffle(places);
            long limit = session.getPoolSize();

            for (int i = 0; i < Math.min(limit, places.size()); i++) {
                var place = places.get(i);

                SessionRestaurant sr = new SessionRestaurant();
                sr.setSessionId(saved.getId());
                sr.setProviderId(place.id());
                sr.setName(place.displayName().text());
                sr.setAddress(place.formattedAddress());
                sr.setCategory(place.types().isEmpty() ? "Restaurant" : place.types().getFirst());
                sr.setRound(1);
                sr.setLikeCount(0);

                // Set the new fields from Google Places data
                sr.setPriceLevel(place.priceLevel() != null ? place.priceLevel().name() : null);
                sr.setPriceRange(place.priceRange());
                sr.setRating(place.rating());
                sr.setUserRatingCount(place.userRatingsTotal());
                sr.setCurrentOpeningHours(place.currentOpeningHours());
                sr.setGenerativeSummary(place.generativeSummary());
                sr.setReviewSummary(place.reviewSummary());
                sr.setWebsiteUri(place.websiteUri());

                SessionRestaurant savedRestaurant = restaurantRepo.save(sr);
            }
            
            // After saving the session
            SessionParticipant participant = new SessionParticipant();
            participant.setSession(saved);
            participant.setUserId(session.getCreatorId());
            participant.setJoinedAt(Instant.now());
            sessionParticipantRepository.save(participant);
            
            return saved;
        } catch (Exception e) {
            System.err.println("Error in createSession: " + e.getMessage());
            e.printStackTrace();
            throw e;
        }
    }
    public Session getSession(Long id, String userId) {
        if (id == null || userId == null) return null;
        Session session = sessionRepository.findById(id).orElse(null);

        if (session == null) return null;

        // Check if user already a participant
        boolean isParticipant = sessionParticipantRepository
                .findBySessionIdAndUserId(id, userId)
                .isPresent();
        if (isParticipant) {
            SessionParticipant participant = new SessionParticipant();
            participant.setSession(session);
            participant.setUserId(userId);
            participant.setJoinedAt(Instant.now());
            sessionParticipantRepository.save(participant);
        }
        return session;
    }
    public List<SessionParticipant> getParticipants(Long id) {
        return sessionParticipantRepository.findBySessionId(id);
    }

    public void endSession(Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        
        session.setStatus("ENDED");
        sessionRepository.save(session);
    }

    public List<RestaurantDto> getFinalRankings(Long sessionId) {
        List<SessionRestaurant> restaurants = restaurantRepo.findBySessionId(sessionId);
        
        return restaurants.stream()
            .sorted(Comparator.comparingInt(SessionRestaurant::getLikeCount).reversed())
            .map(this::convertToDto)
            .collect(Collectors.toList());
    }

    public RestaurantDto getWinner(Long sessionId) {
        List<RestaurantDto> rankings = getFinalRankings(sessionId);
        return rankings.isEmpty() ? null : rankings.get(0);
    }

    public int getTotalVotes(Long sessionId) {
        List<SessionRestaurant> restaurants = restaurantRepo.findBySessionId(sessionId);
        return restaurants.stream()
            .mapToInt(SessionRestaurant::getLikeCount)
            .sum();
    }

    private RestaurantDto convertToDto(SessionRestaurant restaurant) {
        return new RestaurantDto(
            restaurant.getProviderId(),
            restaurant.getName(),
            restaurant.getAddress(),
            restaurant.getCategory(),
            restaurant.getPriceLevel(),
            restaurant.getPriceRange(),
            restaurant.getRating(),
            restaurant.getUserRatingCount(),
            restaurant.getCurrentOpeningHours(),
            restaurant.getGenerativeSummary(),
            restaurant.getReviewSummary(),
            restaurant.getWebsiteUri()
        );
    }
}