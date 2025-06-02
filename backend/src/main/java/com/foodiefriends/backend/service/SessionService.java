package com.foodiefriends.backend.service;

import com.foodiefriends.backend.client.FoursquareClient;
import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionParticipant;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.dto.FoursquareSearchResponse;
import com.foodiefriends.backend.example.session.JoinCodeGenerator;
import com.foodiefriends.backend.repository.SessionParticipantRepository;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository restaurantRepo;
    private final FoursquareClient fsq;
    private final SessionParticipantRepository sessionParticipantRepository;

    public SessionService(SessionRepository sessionRepo, SessionRestaurantRepository restaurantRepo, FoursquareClient fsq, SessionParticipantRepository sessionParticipantRepository) {
        this.sessionRepository = sessionRepo;
        this.restaurantRepo = restaurantRepo;
        this.fsq = fsq;
        this.sessionParticipantRepository = sessionParticipantRepository;
    }
    public Session createSession(Session session) {
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
        
        var response = fsq.search("Astoria, NY", "restaurants");
        List<FoursquareSearchResponse.Place> places = response.results();
        System.out.println("Retrieved " + places.size() + " places from Foursquare");

        // Shuffle and limit
        Collections.shuffle(places);
        long limit = session.getPoolSize();
        System.out.println("Pool size limit: " + limit);

        for (int i = 0; i < Math.min(limit, places.size()); i++) {
            var place = places.get(i);
            var loc = place.location();

            SessionRestaurant sr = new SessionRestaurant();
            sr.setSessionId(saved.getId());
            sr.setProviderId(place.fsq_id());
            sr.setName(place.name());
            sr.setAddress(loc.address() + ", " + loc.locality() + ", " + loc.region());
            sr.setCategory(place.categories().isEmpty() ? "Unknown" : place.categories().getFirst().name());
            sr.setRound(1);
            sr.setLikeCount(0);

            SessionRestaurant savedRestaurant = restaurantRepo.save(sr);
            System.out.println("Saved restaurant: " + savedRestaurant.getName() + " for session " + saved.getId());
        }
        
        return saved;
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