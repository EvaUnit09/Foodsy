package com.foodsy.service;

import com.foodsy.dto.HomepageResponseDto;
import com.foodsy.dto.RestaurantSummaryDto;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Service
public class HomepageService {

    private static final Logger logger = LoggerFactory.getLogger(HomepageService.class);

    @Autowired
    private RestaurantCacheService restaurantCacheService;

    private static final int PICKS_SIZE = 6;
    private static final int NEIGHBORHOOD_HIGHLIGHTS_SIZE = 8;
    private static final int TRENDING_NOW_SIZE = 4;
    private static final int SPOTLIGHT_SIZE = 4;
    private static final String DEFAULT_BOROUGH = "Manhattan";

    public HomepageResponseDto getHomepageForUser(Long userId, String userName) {
        logger.info("Building homepage for user: {} ({})", userId, userName);
        long startTime = System.currentTimeMillis();

        try {
            HomepageResponseDto response = HomepageResponseDto.builder()
                .authenticated(true, userName)
                .yourPicks(getDefaultPicks(DEFAULT_BOROUGH))
                .neighborhoodHighlights(getNeighborhoodHighlights(DEFAULT_BOROUGH))
                .trendingNow(getTrendingNow(DEFAULT_BOROUGH))
                .spotlight(getSpotlight(DEFAULT_BOROUGH))
                .metadata(DEFAULT_BOROUGH, getTotalRestaurantsInCache())
                .performance(System.currentTimeMillis() - startTime, true, "cache")
                .build();

            logger.info("Successfully built homepage for user: {} in {}ms",
                       userId, response.getResponseTimeMs());

            return response;

        } catch (Exception e) {
            logger.error("Error building homepage for user {}: {}", userId, e.getMessage());
            return getEmptyHomepage(true, userName);
        }
    }

    public HomepageResponseDto getHomepageForAnonymous() {
        logger.info("Building homepage for anonymous user");
        long startTime = System.currentTimeMillis();

        try {
            HomepageResponseDto response = HomepageResponseDto.builder()
                .authenticated(false, null)
                .yourPicks(getDefaultPicks(DEFAULT_BOROUGH))
                .neighborhoodHighlights(getNeighborhoodHighlights(DEFAULT_BOROUGH))
                .trendingNow(getTrendingNow(DEFAULT_BOROUGH))
                .spotlight(getSpotlight(DEFAULT_BOROUGH))
                .metadata(DEFAULT_BOROUGH, getTotalRestaurantsInCache())
                .performance(System.currentTimeMillis() - startTime, true, "cache")
                .build();

            logger.info("Successfully built anonymous homepage in {}ms", response.getResponseTimeMs());

            return response;

        } catch (Exception e) {
            logger.error("Error building anonymous homepage: {}", e.getMessage());
            return getEmptyHomepage(false, null);
        }
    }

    private List<RestaurantSummaryDto> getDefaultPicks(String borough) {
        try {
            return restaurantCacheService.getRestaurantsForBorough(borough, PICKS_SIZE);
        } catch (Exception e) {
            logger.error("Error getting default picks: {}", e.getMessage());
            return List.of();
        }
    }

    private List<RestaurantSummaryDto> getNeighborhoodHighlights(String borough) {
        try {
            List<RestaurantSummaryDto> withPhotos = restaurantCacheService.getRestaurantsWithPhotos(
                borough, NEIGHBORHOOD_HIGHLIGHTS_SIZE);

            if (withPhotos.size() >= NEIGHBORHOOD_HIGHLIGHTS_SIZE) {
                return withPhotos;
            }

            List<RestaurantSummaryDto> general = restaurantCacheService.getRestaurantsForBorough(
                borough, NEIGHBORHOOD_HIGHLIGHTS_SIZE);

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

    private List<RestaurantSummaryDto> getTrendingNow(String borough) {
        try {
            return restaurantCacheService.getTrendingRestaurants(borough, TRENDING_NOW_SIZE);
        } catch (Exception e) {
            logger.error("Error getting trending restaurants: {}", e.getMessage());
            return restaurantCacheService.getRestaurantsForBorough(borough, TRENDING_NOW_SIZE);
        }
    }

    private List<RestaurantSummaryDto> getSpotlight(String borough) {
        try {
            return restaurantCacheService.getSpotlightRestaurants(borough, SPOTLIGHT_SIZE);
        } catch (Exception e) {
            logger.error("Error getting spotlight restaurants: {}", e.getMessage());
            return List.of();
        }
    }

    private Integer getTotalRestaurantsInCache() {
        try {
            return (int) restaurantCacheService.getCacheStats().totalCachedRestaurants();
        } catch (Exception e) {
            logger.error("Error getting cache stats: {}", e.getMessage());
            return 0;
        }
    }

    private HomepageResponseDto getEmptyHomepage(boolean isAuthenticated, String userName) {
        return HomepageResponseDto.builder()
            .authenticated(isAuthenticated, userName)
            .yourPicks(List.of())
            .neighborhoodHighlights(List.of())
            .trendingNow(List.of())
            .spotlight(List.of())
            .metadata(DEFAULT_BOROUGH, 0)
            .performance(0, false, "error")
            .build();
    }

    public RefreshResult refreshBoroughData(String borough) {
        logger.info("Refreshing data for borough: {}", borough);
        long startTime = System.currentTimeMillis();

        try {
            List<RestaurantSummaryDto> refreshed = restaurantCacheService.fetchAndCacheForBorough(borough, 50);
            long refreshTime = System.currentTimeMillis() - startTime;

            if (refreshed.isEmpty()) {
                logger.warn("Refresh returned 0 restaurants for borough: {} — possible quota exhaustion or fetch failure", borough);
                return new RefreshResult(borough, 0, refreshTime, false, "No restaurants returned; quota may be exhausted");
            }

            logger.info("Successfully refreshed {} restaurants for borough: {} in {}ms",
                       refreshed.size(), borough, refreshTime);

            return new RefreshResult(borough, refreshed.size(), refreshTime, true, null);

        } catch (Exception e) {
            logger.error("Error refreshing data for borough {}: {}", borough, e.getMessage());
            return new RefreshResult(borough, 0, System.currentTimeMillis() - startTime, false, e.getMessage());
        }
    }

    public HomepageStats getHomepageStats() {
        try {
            var cacheStats = restaurantCacheService.getCacheStats();
            return new HomepageStats(
                cacheStats.totalCachedRestaurants(),
                cacheStats.restaurantsByBorough(),
                cacheStats.restaurantsNeedingRefresh()
            );
        } catch (Exception e) {
            logger.error("Error getting homepage stats: {}", e.getMessage());
            return new HomepageStats(0L, List.of(), 0);
        }
    }

    public void updateTrendingScoresForBorough(String borough) {
        logger.info("Updating trending scores for borough: {}", borough);
        restaurantCacheService.updateTrendingScores(borough);
    }

    public Map<String, Object> getTrendingStatsForBorough(String borough) {
        RestaurantCacheService.TrendingStats stats = restaurantCacheService.getTrendingStats(borough);

        return Map.of(
            "borough", borough,
            "trendingStats", Map.of(
                "minScore", stats.minScore(),
                "maxScore", stats.maxScore(),
                "avgScore", Math.round(stats.avgScore() * 100.0) / 100.0,
                "totalRestaurants", stats.totalRestaurants()
            ),
            "lastUpdated", System.currentTimeMillis()
        );
    }

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
        int restaurantsNeedingRefresh
    ) {}
}
