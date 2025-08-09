package com.foodsy.service;

import com.foodsy.client.GooglePlacesClient;
import com.foodsy.client.IpGeoClient;
import com.foodsy.domain.Session;
import com.foodsy.domain.SessionParticipant;
import com.foodsy.domain.SessionRestaurant;
import com.foodsy.dto.GooglePlacesSearchResponse;
import com.foodsy.dto.SessionRequest;
import com.foodsy.dto.RestaurantDto;
import com.foodsy.example.session.JoinCodeGenerator;
import com.foodsy.repository.SessionParticipantRepository;
import com.foodsy.repository.SessionRepository;
import com.foodsy.repository.SessionRestaurantRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
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
    private final IpGeoClient ipGeoClient;

    
    @Value("${session.timeout.max-duration-hours:1}")
    private int maxDurationHours;

    public SessionService(SessionRepository sessionRepo, SessionRestaurantRepository restaurantRepo, GooglePlacesClient placesClient, SessionParticipantRepository sessionParticipantRepository, IpGeoClient ipGeoClient) {
        this.sessionRepository = sessionRepo;
        this.restaurantRepo = restaurantRepo;
        this.placesClient = placesClient;
        this.sessionParticipantRepository = sessionParticipantRepository;
        this.ipGeoClient = ipGeoClient;
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
            
            // Set session expiration time
            Instant now = Instant.now();
            session.setCreatedAt(now);
            session.setLastActivityAt(now);
            session.setExpiresAt(now.plus(maxDurationHours, ChronoUnit.HOURS));
            
            Session saved = sessionRepository.save(session);
            
            // The controller will now pass optional lat/lng via Session fields or a DTO.
            // For now preserve legacy behavior by using a default search if not provided.
            GooglePlacesSearchResponse response = placesClient.search("Astoria, NY", "restaurants");
            List<GooglePlacesSearchResponse.Place> places = new ArrayList<>(response.places());
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
                sr.setPriceLevel(place.priceLevel() != null ? place.priceLevel().name() : null);
                sr.setPriceRange(place.priceRange());
                sr.setRating(place.rating());
                sr.setUserRatingCount(place.userRatingsTotal());
                sr.setCurrentOpeningHours(place.currentOpeningHours());
                sr.setGenerativeSummary(place.generativeSummary());
                sr.setReviewSummary(place.reviewSummary());
                sr.setWebsiteUri(place.websiteUri());
                restaurantRepo.save(sr);
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

    /**
     * New geolocation-aware variant using provided coordinates or IP geo fallback.
     * Radius default: 4000m. Diversified seeding TBD.
     */
    public Session createSession(SessionRequest req, String creatorId, String clientIp) {
        if (creatorId == null || req == null || req.getPoolSize() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Missing required fields: creatorId, poolSize");
        }

        Session session = new Session();
        session.setCreatorId(creatorId);
        session.setPoolSize(req.getPoolSize());
        session.setRoundTime(req.getRoundTime());
        session.setLikesPerUser(req.getLikesPerUser());
        session.setStatus("OPEN");

        Session saved = createSession(session);

        // Resolve coordinates: provided lat/lng else IP geo fallback
        Double lat = req.getLat();
        Double lng = req.getLng();
        if (lat == null || lng == null) {
            ipGeoClient.lookup(clientIp).ifPresent(coords -> {
                // box into Double
                // Only set if still null
                if (req.getLat() == null) req.setLat(coords[0]);
                if (req.getLng() == null) req.setLng(coords[1]);
            });
            lat = req.getLat();
            lng = req.getLng();
        }

        if (lat != null && lng != null) {
            GooglePlacesSearchResponse nearby = placesClient.searchNearby(lat, lng, 4000.0, Math.max(20, req.getPoolSize()));
            List<GooglePlacesSearchResponse.Place> places = new ArrayList<>(nearby.places());
            // Filter out clearly low-quality (rating < 3.0) or missing names
            places = places.stream()
                    .filter(p -> p != null && p.name() != null && (p.rating() == null || p.rating() >= 3.0))
                    .toList();

            // Dedupe by providerId
            java.util.LinkedHashMap<String, GooglePlacesSearchResponse.Place> byId = new java.util.LinkedHashMap<>();
            for (var p : places) {
                byId.putIfAbsent(p.id(), p);
            }
            List<GooglePlacesSearchResponse.Place> unique = new java.util.ArrayList<>(byId.values());

            // Diversify buckets: priceLevel + rating band + primary type
            java.util.Map<String, java.util.Deque<GooglePlacesSearchResponse.Place>> buckets = new java.util.LinkedHashMap<>();
            for (var p : unique) {
                String price = p.priceLevel() != null ? p.priceLevel().name() : "UNKNOWN";
                String band = p.rating() == null ? "R0" : (p.rating() >= 4.5 ? "R45" : p.rating() >= 4.0 ? "R40" : p.rating() >= 3.5 ? "R35" : "R30");
                String type = (p.types() != null && !p.types().isEmpty()) ? p.types().getFirst() : "restaurant";
                String key = price + "|" + band + "|" + type;
                buckets.computeIfAbsent(key, k -> new java.util.ArrayDeque<>()).add(p);
            }

            // Create a deterministic iteration order over buckets based on sessionId seed
            java.util.List<String> bucketKeys = new java.util.ArrayList<>(buckets.keySet());
            seededShuffle(bucketKeys, saved.getId());

            // Round-robin sample across buckets to target pool size
            java.util.List<GooglePlacesSearchResponse.Place> diversified = new java.util.ArrayList<>();
            int target = Math.min(req.getPoolSize(), unique.size());
            while (diversified.size() < target) {
                boolean tookAny = false;
                for (String key : bucketKeys) {
                    var dq = buckets.get(key);
                    if (dq == null || dq.isEmpty()) continue;
                    diversified.add(dq.pollFirst());
                    tookAny = true;
                    if (diversified.size() >= target) break;
                }
                if (!tookAny) break; // all buckets empty
            }

            // Replace any existing seeded restaurants with this nearby pool
            List<SessionRestaurant> existing = restaurantRepo.findBySessionId(saved.getId());
            restaurantRepo.deleteAll(existing);

            for (var place : diversified) {
                SessionRestaurant sr = new SessionRestaurant();
                sr.setSessionId(saved.getId());
                sr.setProviderId(place.id());
                sr.setName(place.displayName() != null ? place.displayName().text() : place.name());
                sr.setAddress(place.formattedAddress());
                sr.setCategory(place.types() != null && !place.types().isEmpty() ? place.types().getFirst() : "Restaurant");
                sr.setRound(1);
                sr.setLikeCount(0);
                sr.setPriceLevel(place.priceLevel() != null ? place.priceLevel().name() : null);
                sr.setPriceRange(place.priceRange());
                sr.setRating(place.rating());
                sr.setUserRatingCount(place.userRatingsTotal());
                sr.setCurrentOpeningHours(place.currentOpeningHours());
                sr.setGenerativeSummary(place.generativeSummary());
                sr.setReviewSummary(place.reviewSummary());
                sr.setWebsiteUri(place.websiteUri());
                restaurantRepo.save(sr);
            }
        }

        return saved;
    }

    private static <T> void seededShuffle(java.util.List<T> list, Long seedSource) {
        if (list == null || list.size() <= 1 || seedSource == null) return;
        java.util.Random rnd = new java.util.Random(seedSource);
        for (int i = list.size() - 1; i > 0; i--) {
            int j = rnd.nextInt(i + 1);
            if (j == i) continue;
            java.util.Collections.swap(list, i, j);
        }
    }
    public Session getSession(Long id, String userId) {
        if (id == null || userId == null) return null;
        Session session = sessionRepository.findById(id).orElse(null);

        if (session == null) return null;

        // Check if session has expired
        if (session.isExpired()) {
            session.setStatus("expired");
            sessionRepository.save(session);
            throw new ResponseStatusException(HttpStatus.GONE, "Session has expired");
        }

        // Update session activity
        updateSessionActivity(session);

        // Check if user already a participant
        boolean isParticipant = sessionParticipantRepository
                .findBySessionIdAndUserId(id, userId)
                .isPresent();
        if (!isParticipant) {
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
    
    /**
     * Update session activity timestamp
     */
    public void updateSessionActivity(Session session) {
        if (session != null && session.isActive()) {
            session.updateActivity();
            sessionRepository.save(session);
        }
    }
    
    /**
     * Update session activity by ID
     */
    public void updateSessionActivity(Long sessionId) {
        sessionRepository.findById(sessionId).ifPresent(session -> {
            updateSessionActivity(session);
        });
    }
    
    /**
     * Manually end a session
     */
    public void endSession(Long sessionId, String reason) {
        sessionRepository.findById(sessionId).ifPresent(session -> {
            session.setStatus("ended");
            sessionRepository.save(session);
            
            // Log the reason for ending the session
            System.out.println("Session " + sessionId + " ended: " + (reason != null ? reason : "Manual termination"));
        });
    }
}