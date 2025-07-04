package com.foodiefriends.backend.service;

import com.foodiefriends.backend.client.GooglePlacesClient;
import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionParticipant;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.dto.GooglePlacesSearchResponse;
import com.foodiefriends.backend.example.session.JoinCodeGenerator;
import com.foodiefriends.backend.repository.SessionParticipantRepository;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

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
            System.out.println("Starting createSession with creatorId: " + session.getCreatorId());
            
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
            System.out.println("Created session with ID: " + saved.getId());
            
            System.out.println("About to call Google Places API...");
            var response = placesClient.search("Astoria, NY", "restaurants");
            System.out.println("Google Places API call completed");
            
            List<GooglePlacesSearchResponse.Place> places = new ArrayList<>(response.places());
            System.out.println("Retrieved " + places.size() + " places from Google Places");

            // Shuffle and limit
            Collections.shuffle(places);
            long limit = session.getPoolSize();
            System.out.println("Pool size limit: " + limit);

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

                SessionRestaurant savedRestaurant = restaurantRepo.save(sr);
                System.out.println("Saved restaurant: " + savedRestaurant.getName() + " for session " + saved.getId());
            }
            
            System.out.println("Session creation completed successfully");
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
}