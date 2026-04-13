package com.foodsy.service;

import com.foodsy.domain.Neighborhood;
import com.foodsy.domain.RestaurantCache;
import com.foodsy.domain.SessionParticipant;
import com.foodsy.domain.SessionRestaurant;
import com.foodsy.domain.User;
import com.foodsy.repository.NeighborhoodRepository;
import com.foodsy.repository.RestaurantCacheRepository;
import com.foodsy.repository.SessionParticipantRepository;
import com.foodsy.repository.SessionRestaurantRepository;
import com.foodsy.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class LocationService {

    private final SessionParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final NeighborhoodRepository neighborhoodRepository;
    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final RestaurantCacheRepository restaurantCacheRepository;

    public LocationService(SessionParticipantRepository participantRepository,
                           UserRepository userRepository,
                           NeighborhoodRepository neighborhoodRepository,
                           SessionRestaurantRepository sessionRestaurantRepository,
                           RestaurantCacheRepository restaurantCacheRepository) {
        this.participantRepository = participantRepository;
        this.userRepository = userRepository;
        this.neighborhoodRepository = neighborhoodRepository;
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.restaurantCacheRepository = restaurantCacheRepository;
    }

    public record RecommendedRestaurant(
            String providerId,
            String name,
            String address,
            String category,
            Double rating,
            String priceLevel,
            double distanceFromCentroidKm
    ) {}

    public record RecommendationResult(
            List<RecommendedRestaurant> restaurants,
            int participantsWithLocation,
            int totalParticipants
    ) {}

    public RecommendationResult getRecommendedRestaurants(Long sessionId) {
        List<SessionParticipant> participants = participantRepository.findBySessionId(sessionId);
        int totalParticipants = participants.size();

        List<double[]> coords = new ArrayList<>();
        for (SessionParticipant participant : participants) {
            Optional<User> userOpt = userRepository.findByUsername(participant.getUserId());
            if (userOpt.isEmpty()) continue;
            User user = userOpt.get();
            if (user.getHomeNeighborhood() == null || user.getHomeBorough() == null) continue;

            neighborhoodRepository.findByNameIgnoreCaseAndBoroughIgnoreCase(
                    user.getHomeNeighborhood(), user.getHomeBorough()
            ).ifPresent(n -> coords.add(new double[]{n.getCenterLat(), n.getCenterLng()}));
        }

        if (coords.isEmpty()) {
            return new RecommendationResult(List.of(), 0, totalParticipants);
        }

        double centroidLat = coords.stream().mapToDouble(c -> c[0]).average().orElse(0);
        double centroidLng = coords.stream().mapToDouble(c -> c[1]).average().orElse(0);

        List<SessionRestaurant> sessionRestaurants = sessionRestaurantRepository.findBySessionId(sessionId);

        List<RecommendedRestaurant> recommendations = new ArrayList<>();
        for (SessionRestaurant sr : sessionRestaurants) {
            Optional<RestaurantCache> cacheOpt = restaurantCacheRepository.findByPlaceId(sr.getProviderId());
            if (cacheOpt.isEmpty()) continue;
            RestaurantCache cache = cacheOpt.get();
            if (cache.getLatitude() == null || cache.getLongitude() == null) continue;

            double distance = haversineKm(centroidLat, centroidLng, cache.getLatitude(), cache.getLongitude());
            recommendations.add(new RecommendedRestaurant(
                    sr.getProviderId(),
                    sr.getName(),
                    sr.getAddress(),
                    sr.getCategory(),
                    sr.getRating(),
                    sr.getPriceLevel(),
                    Math.round(distance * 100.0) / 100.0
            ));
        }

        recommendations.sort(Comparator.comparingDouble(RecommendedRestaurant::distanceFromCentroidKm));
        List<RecommendedRestaurant> top5 = recommendations.stream().limit(5).collect(Collectors.toList());

        return new RecommendationResult(top5, coords.size(), totalParticipants);
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double r = 6371.0;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return r * c;
    }
}
