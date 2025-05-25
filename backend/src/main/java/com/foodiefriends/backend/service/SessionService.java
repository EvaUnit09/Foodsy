package com.foodiefriends.backend.service;

import com.foodiefriends.backend.client.FoursquareClient;
import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.dto.FoursquareSearchResponse;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import org.springframework.stereotype.Service;

import java.util.Collections;
import java.util.List;

@Service
public class SessionService {
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository restaurantRepo;
    private final FoursquareClient fsq;

    public SessionService(SessionRepository sessionRepo, SessionRestaurantRepository restaurantRepo, FoursquareClient fsq) {
        this.sessionRepository = sessionRepo;
        this.restaurantRepo = restaurantRepo;
        this.fsq = fsq;
    }
    public Session createSession(Session session) {
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
}