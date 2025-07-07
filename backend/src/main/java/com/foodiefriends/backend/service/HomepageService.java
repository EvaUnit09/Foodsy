package com.foodiefriends.backend.service;

import com.foodiefriends.backend.dto.HomepageResponseDto;
import com.foodiefriends.backend.dto.RestaurantSummaryDto;
import com.foodiefriends.backend.dto.TasteProfileDto;
import com.foodiefriends.backend.service.TasteProfileService.RestaurantSearchCriteria;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
public class HomepageService {

    private static final Logger logger = LoggerFactory.getLogger(HomepageService.class);

    @Autowired
    private TasteProfileService tasteProfileService;

    @Autowired
    private RestaurantCacheService restaurantCacheService;

    @Autowired
    private HomepageAnalyticsService analyticsService;

    // Section sizes for consistent homepage layout
    private static final int YOUR_PICKS_SIZE = 6;
    private static final int NEIGHBORHOOD_HIGHLIGHTS_SIZE = 8;
    private static final int TRENDING_NOW_SIZE = 4;
    private static final int SPOTLIGHT_SIZE = 4;

    /**
     * Get complete homepage data for authenticated user
     */
    public HomepageResponseDto getHomepageForUser(Long userId, String userName) {
        logger.info("Building homepage for user: {} ({})", userId, userName);
        long startTime = System.currentTimeMillis();

        try {
            // Get user's taste profile
            Optional<TasteProfileDto> tasteProfile = tasteProfileService.getUserTasteProfile(userId);
            boolean hasTasteProfile = tasteProfile.isPresent();

            // Determine primary borough (user's preference or default)
            String primaryBorough = tasteProfile
                .map(TasteProfileDto::getPreferredBorough)
                .orElse("Manhattan"); // Default to Manhattan

            // Get personalized criteria
            RestaurantSearchCriteria criteria = tasteProfileService.getPersonalizedCriteria(userId);

            // Build homepage sections
            HomepageResponseDto response = HomepageResponseDto.builder()
                .authenticated(true, userName)
                .tasteProfile(tasteProfile.orElse(null))
                .yourPicks(getYourPicks(criteria))
                .neighborhoodHighlights(getNeighborhoodHighlights(primaryBorough))
                .trendingNow(getTrendingNow(primaryBorough))
                .spotlight(getSpotlight(primaryBorough))
                .metadata(primaryBorough, getTotalRestaurantsInCache(), !hasTasteProfile)
                .performance(System.currentTimeMillis() - startTime, true, "cache")
                .build();

            logger.info("Successfully built homepage for user: {} with {} total restaurants in {}ms", 
                       userId, response.getTotalRestaurantCount(), response.getResponseTimeMs());

            return response;

        } catch (Exception e) {
            logger.error("Error building homepage for user {}: {}", userId, e.getMessage());
            return getEmptyHomepage(true, userName);
        }
    }

    /**
     * Get homepage data for anonymous user
     */
    public HomepageResponseDto getHomepageForAnonymous() {
        logger.info("Building homepage for anonymous user");
        long startTime = System.currentTimeMillis();

        try {
            String defaultBorough = "Manhattan"; // Default for anonymous users

            HomepageResponseDto response = HomepageResponseDto.builder()
                .authenticated(false, null)
                .tasteProfile(null)
                .yourPicks(getDefaultPicks(defaultBorough))
                .neighborhoodHighlights(getNeighborhoodHighlights(defaultBorough))
                .trendingNow(getTrendingNow(defaultBorough))
                .spotlight(getSpotlight(defaultBorough))
                .metadata(defaultBorough, getTotalRestaurantsInCache(), true) // Show onboarding
                .performance(System.currentTimeMillis() - startTime, true, "cache")
                .build();

            logger.info("Successfully built anonymous homepage with {} total restaurants in {}ms", 
                       response.getTotalRestaurantCount(), response.getResponseTimeMs());

            return response;

        } catch (Exception e) {
            logger.error("Error building anonymous homepage: {}", e.getMessage());
            return getEmptyHomepage(false, null);
        }
    }

    /**
     * Get personalized restaurant picks based on user preferences
     */
    private List<RestaurantSummaryDto> getYourPicks(RestaurantSearchCriteria criteria) {
        logger.debug("Getting personalized picks for borough: {}, price level: {}", 
                    criteria.getBorough(), criteria.getPriceLevel());

        try {
            // Convert cuisines set to list if not null
            List<String> cuisinesList = criteria.getCuisines() != null 
                ? new ArrayList<>(criteria.getCuisines()) 
                : null;

            return restaurantCacheService.getPersonalizedRestaurants(
                criteria.getBorough(),
                criteria.getPriceLevel(),
                cuisinesList,
                criteria.getMinRating(),
                YOUR_PICKS_SIZE
            );
        } catch (Exception e) {
            logger.error("Error getting personalized picks: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Get default picks for users without taste profiles
     */
    private List<RestaurantSummaryDto> getDefaultPicks(String borough) {
        logger.debug("Getting default picks for borough: {}", borough);

        try {
            return restaurantCacheService.getRestaurantsForBorough(borough, YOUR_PICKS_SIZE);
        } catch (Exception e) {
            logger.error("Error getting default picks: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Get neighborhood highlights (top-rated restaurants in the area)
     */
    private List<RestaurantSummaryDto> getNeighborhoodHighlights(String borough) {
        logger.debug("Getting neighborhood highlights for borough: {}", borough);

        try {
            // Prefer restaurants with photos for visual appeal
            List<RestaurantSummaryDto> withPhotos = restaurantCacheService.getRestaurantsWithPhotos(
                borough, NEIGHBORHOOD_HIGHLIGHTS_SIZE);

            if (withPhotos.size() >= NEIGHBORHOOD_HIGHLIGHTS_SIZE) {
                return withPhotos;
            }

            // Fill remaining slots with general high-rated restaurants
            List<RestaurantSummaryDto> general = restaurantCacheService.getRestaurantsForBorough(
                borough, NEIGHBORHOOD_HIGHLIGHTS_SIZE);

            // Combine and deduplicate
            List<RestaurantSummaryDto> combined = new ArrayList<>(withPhotos);
            for (RestaurantSummaryDto restaurant : general) {
                if (combined.stream().noneMatch(r -> r.getPlaceId().equals(restaurant.getPlaceId()))) {
                    combined.add(restaurant);
                    if (combined.size() >= NEIGHBORHOOD_HIGHLIGHTS_SIZE) break;
                }
            }

            return combined;
        } catch (Exception e) {
            logger.error("Error getting neighborhood highlights: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Get trending restaurants (recently popular)
     */
    private List<RestaurantSummaryDto> getTrendingNow(String borough) {
        logger.debug("Getting trending restaurants for borough: {}", borough);

        try {
            return restaurantCacheService.getTrendingRestaurants(borough, TRENDING_NOW_SIZE);
        } catch (Exception e) {
            logger.error("Error getting trending restaurants: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Get spotlight restaurants (random high-rated for variety)
     */
    private List<RestaurantSummaryDto> getSpotlight(String borough) {
        logger.debug("Getting spotlight restaurants for borough: {}", borough);

        try {
            return restaurantCacheService.getSpotlightRestaurants(borough, SPOTLIGHT_SIZE);
        } catch (Exception e) {
            logger.error("Error getting spotlight restaurants: {}", e.getMessage());
            return List.of();
        }
    }

    /**
     * Get total restaurants in cache (for metadata)
     */
    private Integer getTotalRestaurantsInCache() {
        try {
            return (int) restaurantCacheService.getCacheStats().totalCachedRestaurants();
        } catch (Exception e) {
            logger.error("Error getting cache stats: {}", e.getMessage());
            return 0;
        }
    }

    /**
     * Get empty homepage fallback
     */
    private HomepageResponseDto getEmptyHomepage(boolean isAuthenticated, String userName) {
        return HomepageResponseDto.builder()
            .authenticated(isAuthenticated, userName)
            .tasteProfile(null)
            .yourPicks(List.of())
            .neighborhoodHighlights(List.of())
            .trendingNow(List.of())
            .spotlight(List.of())
            .metadata("Manhattan", 0, true)
            .performance(0, false, "error")
            .build();
    }

    /**
     * Refresh homepage data for a specific borough (admin/maintenance function)
     */
    public RefreshResult refreshBoroughData(String borough) {
        logger.info("Refreshing data for borough: {}", borough);
        long startTime = System.currentTimeMillis();

        try {
            // Fetch fresh data from Places API
            List<RestaurantSummaryDto> refreshed = restaurantCacheService.fetchAndCacheForBorough(
                borough, 50); // Fetch more restaurants for variety

            long refreshTime = System.currentTimeMillis() - startTime;
            
            logger.info("Successfully refreshed {} restaurants for borough: {} in {}ms", 
                       refreshed.size(), borough, refreshTime);

            return new RefreshResult(
                borough,
                refreshed.size(),
                refreshTime,
                true,
                null
            );

        } catch (Exception e) {
            logger.error("Error refreshing data for borough {}: {}", borough, e.getMessage());
            return new RefreshResult(
                borough,
                0,
                System.currentTimeMillis() - startTime,
                false,
                e.getMessage()
            );
        }
    }

    /**
     * Get homepage performance statistics
     */
    public HomepageStats getHomepageStats() {
        logger.debug("Getting homepage statistics");

        try {
            // Get cache statistics
            var cacheStats = restaurantCacheService.getCacheStats();
            
            // Get analytics for last 7 days
            var analyticsStats = analyticsService.getAnalyticsSummary(7);
            
            // Get popular sections
            var popularSections = analyticsService.getPopularSections(7);

            return new HomepageStats(
                cacheStats.totalCachedRestaurants(),
                cacheStats.restaurantsByBorough(),
                cacheStats.restaurantsNeedingRefresh(),
                analyticsStats.sessionStarts(),
                analyticsStats.conversionRate(),
                popularSections
            );

        } catch (Exception e) {
            logger.error("Error getting homepage stats: {}", e.getMessage());
            return new HomepageStats(0L, List.of(), 0, 0L, 0.0, List.of());
        }
    }

    /**
     * Track homepage analytics event
     */
    public void trackEvent(Long userId, String eventType, String section, String restaurantPlaceId) {
        try {
            if (userId != null) {
                analyticsService.trackEvent(userId, new com.foodiefriends.backend.dto.HomepageAnalyticsDto(
                    eventType, section, restaurantPlaceId));
            }
        } catch (Exception e) {
            logger.error("Error tracking homepage event: {}", e.getMessage());
        }
    }

    /**
     * Track anonymous homepage analytics event
     */
    public void trackAnonymousEvent(String sessionId, String eventType, String section, String restaurantPlaceId) {
        try {
            analyticsService.trackAnonymousEvent(sessionId, new com.foodiefriends.backend.dto.HomepageAnalyticsDto(
                eventType, section, restaurantPlaceId));
        } catch (Exception e) {
            logger.error("Error tracking anonymous homepage event: {}", e.getMessage());
        }
    }

    // Helper records
    public record RefreshResult(
        String borough,
        int restaurantsRefreshed,
        long refreshTimeMs,
        boolean success,
        String errorMessage
    ) {}

    public record HomepageStats(
        long totalCachedRestaurants,
        List<Object[]> restaurantsByBorough,
        int restaurantsNeedingRefresh,
        long sessionStartsLast7Days,
        double conversionRate,
        List<Object[]> popularSections
    ) {}
} 