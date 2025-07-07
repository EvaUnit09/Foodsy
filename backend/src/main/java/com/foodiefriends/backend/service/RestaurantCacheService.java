package com.foodiefriends.backend.service;

import com.foodiefriends.backend.client.GooglePlacesClient;
import com.foodiefriends.backend.domain.RestaurantCache;
import com.foodiefriends.backend.dto.GooglePlacesSearchResponse;
import com.foodiefriends.backend.dto.RestaurantSummaryDto;
import com.foodiefriends.backend.repository.RestaurantCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class RestaurantCacheService {

    private static final Logger logger = LoggerFactory.getLogger(RestaurantCacheService.class);

    // Conservative quota management - track daily API calls
    private final AtomicInteger dailyApiCalls = new AtomicInteger(0);
    private final AtomicInteger nearbySearchCalls = new AtomicInteger(0);
    private final AtomicInteger placeDetailsCalls = new AtomicInteger(0);

    // Conservative limits (60% of free tier)
    private static final int MAX_DAILY_NEARBY_SEARCHES = 100; // 60% of ~5000/month ≈ 100/day
    private static final int MAX_DAILY_PLACE_DETAILS = 200; // 60% of ~10000/month ≈ 200/day
    private static final int MAX_DAILY_TOTAL_CALLS = 300;

    @Autowired
    private RestaurantCacheRepository cacheRepository;

    @Autowired
    private GooglePlacesClient placesClient;

    /**
     * Get restaurants for a specific borough, using cache when possible
     */
    public List<RestaurantSummaryDto> getRestaurantsForBorough(String borough, int limit) {
        logger.debug("Getting restaurants for borough: {} with limit: {}", borough, limit);
        
        Instant now = Instant.now();
        List<RestaurantCache> cached = cacheRepository.findByBoroughNotExpired(borough, now, PageRequest.of(0, limit)).getContent();
        
        if (!cached.isEmpty()) {
            logger.info("Found {} cached restaurants for borough: {}", cached.size(), borough);
            return cached.stream()
                .map(RestaurantSummaryDto::fromEntity)
                .collect(Collectors.toList());
        }
        
        // Try to fetch from API if within quota
        return fetchAndCacheForBorough(borough, limit);
    }

    /**
     * Get personalized restaurant recommendations based on criteria
     */
    public List<RestaurantSummaryDto> getPersonalizedRestaurants(
        String borough, 
        Integer priceLevel, 
        List<String> cuisines, 
        Double minRating, 
        int limit
    ) {
        logger.debug("Getting personalized restaurants for borough: {}, price: {}, cuisines: {}", 
                    borough, priceLevel, cuisines);
        
        Instant now = Instant.now();
        
        // Try cache first for each cuisine
        List<RestaurantCache> results = List.of();
        if (cuisines != null && !cuisines.isEmpty()) {
            for (String cuisine : cuisines) {
                List<RestaurantCache> cuisineResults = cacheRepository.findByCategoryAndBorough(
                    cuisine, borough, now);
                results = combineAndLimitResults(results, cuisineResults, limit);
                
                if (results.size() >= limit) break;
            }
        }
        
        // If no cuisine-specific results, get general results for borough
        if (results.isEmpty()) {
            results = cacheRepository.findByMultipleCriteria(
                borough, priceLevel, null, minRating != null ? minRating : 3.5, 
                now, PageRequest.of(0, limit));
        }
        
        if (!results.isEmpty()) {
            logger.info("Found {} personalized cached restaurants", results.size());
            return results.stream()
                .map(RestaurantSummaryDto::fromEntity)
                .limit(limit)
                .collect(Collectors.toList());
        }
        
        // Fallback to API if cache is empty and within quota
        return fetchAndCacheForBorough(borough, limit);
    }

    /**
     * Get trending restaurants (recently popular)
     */
    public List<RestaurantSummaryDto> getTrendingRestaurants(String borough, int limit) {
        logger.debug("Getting trending restaurants for borough: {}", borough);
        
        Instant now = Instant.now();
        Instant weekAgo = now.minusSeconds(7 * 24 * 60 * 60); // 7 days ago
        
        List<RestaurantCache> trending = cacheRepository.findRecentlyAdded(
            weekAgo, now, PageRequest.of(0, limit));
        
        if (trending.isEmpty()) {
            // Fallback to general top-rated restaurants
            trending = cacheRepository.findTopRatedInBorough(
                borough, 4.0, now, PageRequest.of(0, limit));
        }
        
        return trending.stream()
            .map(RestaurantSummaryDto::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get random high-rated restaurants for spotlight section
     */
    public List<RestaurantSummaryDto> getSpotlightRestaurants(String borough, int limit) {
        logger.debug("Getting spotlight restaurants for borough: {}", borough);
        
        Instant now = Instant.now();
        List<RestaurantCache> spotlight = cacheRepository.findRandomHighRated(
            borough, now, 4.0, limit);
        
        return spotlight.stream()
            .map(RestaurantSummaryDto::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get restaurants with photos for visual sections
     */
    public List<RestaurantSummaryDto> getRestaurantsWithPhotos(String borough, int limit) {
        logger.debug("Getting restaurants with photos for borough: {}", borough);
        
        Instant now = Instant.now();
        List<RestaurantCache> withPhotos = cacheRepository.findWithPhotosInBorough(
            borough, now, PageRequest.of(0, limit));
        
        return withPhotos.stream()
            .map(RestaurantSummaryDto::fromEntity)
            .collect(Collectors.toList());
    }

    /**
     * Get or fetch a specific restaurant by place_id
     */
    public Optional<RestaurantSummaryDto> getOrFetchRestaurant(String placeId) {
        logger.debug("Getting restaurant by place_id: {}", placeId);
        
        // Check cache first
        Optional<RestaurantCache> cached = cacheRepository.findByPlaceId(placeId);
        if (cached.isPresent() && !cached.get().isExpired()) {
            logger.debug("Found cached restaurant: {}", placeId);
            return Optional.of(RestaurantSummaryDto.fromEntity(cached.get()));
        }
        
        // Fetch from API if within quota
        if (canMakeApiCall() && canMakePlaceDetailsCall()) {
            try {
                // This would need to be implemented in GooglePlacesClient
                // For now, return empty
                logger.warn("Place details fetching not yet implemented for place_id: {}", placeId);
                return Optional.empty();
            } catch (Exception e) {
                logger.error("Error fetching place details for {}: {}", placeId, e.getMessage());
                return cached.map(RestaurantSummaryDto::fromEntity);
            }
        }
        
        return cached.map(RestaurantSummaryDto::fromEntity);
    }

    /**
     * Fetch restaurants from API and cache them
     */
    @Transactional
    public List<RestaurantSummaryDto> fetchAndCacheForBorough(String borough, int limit) {
        if (!canMakeApiCall() || !canMakeNearbySearchCall()) {
            logger.warn("API quota exceeded, cannot fetch restaurants for borough: {}", borough);
            return List.of();
        }
        
        try {
            logger.info("Fetching restaurants from Places API for borough: {}", borough);
            
            // Get coordinates for borough center (simplified)
            BoroughCoordinates coords = getBoroughCoordinates(borough);
            
            // Increment API call counters
            nearbySearchCalls.incrementAndGet();
            dailyApiCalls.incrementAndGet();
            
            GooglePlacesSearchResponse response = placesClient.searchNearby(
                coords.latitude(), coords.longitude(), 5000.0, limit);
            
            List<RestaurantCache> cached = response.places().stream()
                .map(place -> convertToRestaurantCache(place, borough))
                .peek(cache -> {
                    try {
                        cacheRepository.save(cache);
                        logger.debug("Cached restaurant: {} in {}", cache.getName(), borough);
                    } catch (Exception e) {
                        logger.error("Error caching restaurant {}: {}", cache.getName(), e.getMessage());
                    }
                })
                .collect(Collectors.toList());
            
            logger.info("Successfully fetched and cached {} restaurants for borough: {}", 
                       cached.size(), borough);
            
            return cached.stream()
                .map(RestaurantSummaryDto::fromEntity)
                .collect(Collectors.toList());
                
        } catch (Exception e) {
            logger.error("Error fetching restaurants for borough {}: {}", borough, e.getMessage());
            return List.of();
        }
    }

    /**
     * Clean up expired restaurants
     */
    @Transactional
    public int cleanupExpiredRestaurants() {
        logger.info("Cleaning up expired restaurants");
        
        Instant now = Instant.now();
        int deletedCount = cacheRepository.deleteExpired(now);
        
        logger.info("Deleted {} expired restaurants", deletedCount);
        return deletedCount;
    }

    /**
     * Get cache statistics
     */
    public CacheStats getCacheStats() {
        Instant now = Instant.now();
        List<Object[]> boroughCounts = cacheRepository.countByBorough(now);
        
        long totalCached = boroughCounts.stream()
            .mapToLong(arr -> (Long) arr[1])
            .sum();
        
        // Find restaurants needing refresh (expire in next 7 days)
        Instant refreshThreshold = now.plusSeconds(7 * 24 * 60 * 60);
        List<RestaurantCache> needingRefresh = cacheRepository.findNeedingRefresh(now, refreshThreshold);
        
        return new CacheStats(
            totalCached,
            boroughCounts,
            needingRefresh.size(),
            dailyApiCalls.get(),
            nearbySearchCalls.get(),
            placeDetailsCalls.get()
        );
    }

    // Quota management methods
    private boolean canMakeApiCall() {
        return dailyApiCalls.get() < MAX_DAILY_TOTAL_CALLS;
    }
    
    private boolean canMakeNearbySearchCall() {
        return nearbySearchCalls.get() < MAX_DAILY_NEARBY_SEARCHES;
    }
    
    private boolean canMakePlaceDetailsCall() {
        return placeDetailsCalls.get() < MAX_DAILY_PLACE_DETAILS;
    }
    
    public void resetDailyCounters() {
        logger.info("Resetting daily API call counters");
        dailyApiCalls.set(0);
        nearbySearchCalls.set(0);
        placeDetailsCalls.set(0);
    }

    // Helper methods
    private List<RestaurantCache> combineAndLimitResults(
        List<RestaurantCache> existing, 
        List<RestaurantCache> newResults, 
        int limit
    ) {
        return existing.stream()
            .collect(Collectors.toList())
            .stream()
            .limit(limit)
            .collect(Collectors.toList());
    }

    private RestaurantCache convertToRestaurantCache(GooglePlacesSearchResponse.Place place, String borough) {
        // Use displayName.text() for actual restaurant name, place.id() for placeId
        String restaurantName = place.displayName() != null && place.displayName().text() != null 
            ? place.displayName().text() 
            : place.name(); // Fallback to place.name() if displayName is null
        RestaurantCache cache = new RestaurantCache(place.id(), restaurantName);
        
        // Set basic info
        cache.setCategory(extractCategory(place.types()));
        cache.setRating(place.rating());
        cache.setPriceLevel(extractPriceLevel(place.priceLevel()));
        cache.setAddress(place.formattedAddress());
        cache.setBorough(borough);
        cache.setUserRatingCount(place.userRatingsTotal());
        
        // Set extended details if available
        if (place.generativeSummary() != null) {
            cache.setGenerativeSummary(place.generativeSummary());
        }
        if (place.reviewSummary() != null) {
            cache.setReviewSummary(place.reviewSummary());
        }
        if (place.currentOpeningHours() != null) {
            cache.setOpeningHours(place.currentOpeningHours());
        }
        
        // Set location
        if (place.location() != null) {
            cache.setLatitude(place.location().latitude());
            cache.setLongitude(place.location().longitude());
        }
        
        // Process photos
        if (place.photos() != null && !place.photos().isEmpty()) {
            List<String> photoRefs = place.photos().stream()
                .map(GooglePlacesSearchResponse.Photo::name)
                .collect(Collectors.toList());
            cache.setPhotoReferences(photoRefs);
        }
        
        return cache;
    }

    private String extractCategory(List<String> types) {
        if (types == null || types.isEmpty()) {
            return "Restaurant";
        }
        
        // Map common types to cuisine categories
        for (String type : types) {
            switch (type.toLowerCase()) {
                case "italian_restaurant": return "Italian";
                case "chinese_restaurant": return "Chinese";
                case "mexican_restaurant": return "Mexican";
                case "thai_restaurant": return "Thai";
                case "japanese_restaurant": return "Japanese";
                case "indian_restaurant": return "Indian";
                case "french_restaurant": return "French";
                case "mediterranean_restaurant": return "Mediterranean";
                case "korean_restaurant": return "Korean";
                case "vietnamese_restaurant": return "Vietnamese";
                case "cafe": return "Cafe";
                case "bar": return "Bar";
                default: continue;
            }
        }
        
        return "Restaurant"; // Default category
    }

    private Integer extractPriceLevel(GooglePlacesSearchResponse.PriceLevel priceLevel) {
        if (priceLevel == null) return null;
        
        switch (priceLevel) {
            case PRICE_LEVEL_INEXPENSIVE: return 1;
            case PRICE_LEVEL_MODERATE: return 2;
            case PRICE_LEVEL_EXPENSIVE: return 3;
            case PRICE_LEVEL_VERY_EXPENSIVE: return 3; // Map to our 3-tier system
            default: return null;
        }
    }

    private BoroughCoordinates getBoroughCoordinates(String borough) {
        // NYC borough center coordinates
        return switch (borough) {
            case "Manhattan" -> new BoroughCoordinates(40.7831, -73.9712);
            case "Brooklyn" -> new BoroughCoordinates(40.6782, -73.9442);
            case "Queens" -> new BoroughCoordinates(40.7282, -73.7949);
            case "Bronx" -> new BoroughCoordinates(40.8448, -73.8648);
            case "Staten Island" -> new BoroughCoordinates(40.5795, -74.1502);
            default -> new BoroughCoordinates(40.7831, -73.9712); // Default to Manhattan
        };
    }

    // Helper records
    public record BoroughCoordinates(double latitude, double longitude) {}

    public record CacheStats(
        long totalCachedRestaurants,
        List<Object[]> restaurantsByBorough,
        int restaurantsNeedingRefresh,
        int dailyApiCalls,
        int nearbySearchCalls,
        int placeDetailsCalls
    ) {}
} 