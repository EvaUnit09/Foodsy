package com.foodsy.service;

import com.foodsy.client.GooglePlacesClient;
import com.foodsy.domain.Neighborhood;
import com.foodsy.domain.RestaurantCache;
import com.foodsy.dto.GooglePlacesSearchResponse;
import com.foodsy.dto.RestaurantSummaryDto;
import com.foodsy.repository.NeighborhoodRepository;
import com.foodsy.repository.RestaurantCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.stream.Collectors;

@Service
public class RestaurantCacheService {

    private static final Logger logger = LoggerFactory.getLogger(RestaurantCacheService.class);

    // Per-borough in-flight gate: only the first caller triggers fetchAndCacheTrendingForBorough;
    // concurrent callers for the same borough wait on the existing CompletableFuture.
    private final ConcurrentHashMap<String, CompletableFuture<Void>> discoveryFetchGate = new ConcurrentHashMap<>();

    // Conservative quota management - track daily API calls
    private final AtomicInteger dailyApiCalls = new AtomicInteger(0);
    private final AtomicInteger nearbySearchCalls = new AtomicInteger(0);
    private final AtomicInteger placeDetailsCalls = new AtomicInteger(0);

    // Conservative limits (60% of free tier)
    private static final int MAX_DAILY_NEARBY_SEARCHES = 100; // 60% of ~5000/month ≈ 100/day
    private static final int MAX_DAILY_PLACE_DETAILS = 200; // 60% of ~10000/month ≈ 200/day
    private static final int MAX_DAILY_TOTAL_CALLS = 300;
    
    // Fixed midpoints and search radius for the three supported trending boroughs.
    // Manhattan uses Midtown (high restaurant density); Queens/Brooklyn use borough centers.
    private record TrendingBorough(String name, double lat, double lng, double radiusMeters) {}
    private static final List<TrendingBorough> TRENDING_BOROUGHS = List.of(
        new TrendingBorough("Manhattan", 40.7549, -73.9840, 5000),
        new TrendingBorough("Queens",    40.7282, -73.7949, 5000),
        new TrendingBorough("Brooklyn",  40.7210, -73.9580, 5000)
    );

    // Borough neighborhoods for targeted searches
    private static final Map<String, List<String>> BOROUGH_NEIGHBORHOODS = Map.of(
        "Manhattan", Arrays.asList("SoHo", "Greenwich Village", "Upper East Side", "Midtown", "Lower East Side", 
                                  "Chelsea", "Tribeca", "East Village", "West Village", "Financial District"),
        "Brooklyn", Arrays.asList("Williamsburg", "DUMBO", "Park Slope", "Bushwick", "Crown Heights", 
                                 "Red Hook", "Sunset Park", "Bay Ridge", "Prospect Heights", "Carroll Gardens"),
        "Queens", Arrays.asList("Astoria", "Long Island City", "Flushing", "Jackson Heights", "Forest Hills", 
                               "Elmhurst", "Woodside", "Sunnyside", "Corona", "Ridgewood"),
        "Bronx", Arrays.asList("Fordham", "Mott Haven", "Riverdale", "University Heights", "Castle Hill", 
                              "Concourse", "Morrisania", "Tremont", "Belmont", "Soundview")
    );

    @Autowired
    private RestaurantCacheRepository cacheRepository;

    @Autowired
    private NeighborhoodRepository neighborhoodRepository;

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
     * Retrieve discovery-mode restaurants for a borough or specific neighborhood, using cached results when available.
     *
     * If the cache is empty, triggers a single upstream cache-warming fetch for the borough (or borough:neighborhood) while other concurrent callers wait for completion.
     *
     * @param borough     the borough to search (e.g., "Manhattan")
     * @param neighborhood optional neighborhood name; if null, discovery is performed at the borough level
     * @param limit       maximum number of restaurants to return
     * @return            a list of discovery RestaurantSummaryDto objects (may be empty)
     */
    public List<RestaurantSummaryDto> getDiscoveryRestaurants(String borough, String neighborhood, int limit) {
        logger.debug("Getting discovery restaurants for borough: {}, neighborhood: {}", borough, neighborhood);

        Instant now = Instant.now();
        List<RestaurantCache> results = cacheRepository.findDiscoveryRestaurants(borough, neighborhood, now, 3.5, limit);

        if (!results.isEmpty()) {
            return results.stream().map(RestaurantSummaryDto::fromEntity).collect(Collectors.toList());
        }

        // Cache is empty — gate concurrent fetches so only one thread calls upstream per borough.
        String gateKey = borough + (neighborhood != null ? ":" + neighborhood : "");
        CompletableFuture<Void> myFuture = new CompletableFuture<>();
        CompletableFuture<Void> existing = discoveryFetchGate.putIfAbsent(gateKey, myFuture);

        if (existing != null) {
            existing.join();
        } else {
            try {
                if (neighborhood != null) {
                    fetchAndCacheForNeighborhood(borough, neighborhood);
                } else {
                    fetchAndCacheTrendingForBorough(borough);
                }
            } finally {
                discoveryFetchGate.remove(gateKey, myFuture);
                myFuture.complete(null);
            }
        }

        results = cacheRepository.findDiscoveryRestaurants(borough, neighborhood, now, 3.5, limit);
        return results.stream().map(RestaurantSummaryDto::fromEntity).collect(Collectors.toList());
    }

    /**
     * Fetches restaurants for a named neighborhood from Google Places and upserts them into the local cache.
     *
     * If the neighborhood is not present in the database, this method falls back to fetching trending data for the borough.
     * Successful results are upserted into RestaurantCache and annotated with the neighborhood name, a trending rank,
     * a trending score, and the timestamp of the last trending calculation. Errors for individual places are logged and
     * do not abort processing of other results.
     *
     * @param borough     the borough containing the neighborhood
     * @param neighborhood the neighborhood name whose stored coordinates will be used for the search
     */
    @Transactional
    public void fetchAndCacheForNeighborhood(String borough, String neighborhood) {
        Optional<Neighborhood> nbOpt = neighborhoodRepository
                .findByNameIgnoreCaseAndBoroughIgnoreCase(neighborhood, borough);

        if (nbOpt.isEmpty()) {
            logger.warn("Neighborhood '{}' in '{}' not found in DB, falling back to borough fetch", neighborhood, borough);
            fetchAndCacheTrendingForBorough(borough);
            return;
        }

        Neighborhood nb = nbOpt.get();
        try {
            logger.info("Fetching places for neighborhood {} ({}, {}) radius {}m",
                    nb.getName(), nb.getCenterLat(), nb.getCenterLng(), nb.getRadiusMeters());
            GooglePlacesSearchResponse response = placesClient.searchTrending(
                    nb.getCenterLat(), nb.getCenterLng(), nb.getRadiusMeters(), 20);

            List<GooglePlacesSearchResponse.Place> places = response.places();
            if (places == null || places.isEmpty()) {
                logger.warn("No results from Google Places for neighborhood {}", nb.getName());
                return;
            }

            Instant now = Instant.now();
            for (int i = 0; i < places.size(); i++) {
                try {
                    RestaurantCache entry = upsertRestaurantCache(places.get(i), borough);
                    entry.setNeighborhood(nb.getName());
                    entry.setTrendingRank(i + 1);
                    entry.setTrendingScore(0.0);
                    entry.setLastTrendingCalcAt(now);
                    cacheRepository.save(entry);
                } catch (Exception e) {
                    logger.error("Error saving restaurant for neighborhood {}: {}", nb.getName(), e.getMessage());
                }
            }
            logger.info("Cached {} restaurants for neighborhood {}", places.size(), nb.getName());
        } catch (Exception e) {
            logger.error("Error fetching for neighborhood {}: {}", nb.getName(), e.getMessage());
        }
    }

    /**
     * Get random high-rated restaurants for spotlight section
     */
    public List<RestaurantSummaryDto> getSpotlightRestaurants(String borough, int limit) {
        logger.debug("Getting spotlight restaurants for borough: {}", borough);
        
        Instant now = Instant.now();
        List<RestaurantCache> spotlight = cacheRepository.findRandomHighRated(
            borough, now, 4.5, limit);
        
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
                .map(place -> upsertRestaurantCache(place, borough))
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

    /**
         * Creates or updates a RestaurantCache for the given Google Places result, populates identifying,
         * location, metadata, and derived fields (e.g., category, price level, vibe tags, expiration), then saves
         * and returns the persistent entity.
         *
         * @param place   the Google Places search result to upsert into the cache
         * @param borough the borough name to assign to the cached restaurant
         * @return        the saved RestaurantCache entity with updated fields
         */
    @Transactional
    RestaurantCache upsertRestaurantCache(GooglePlacesSearchResponse.Place place, String borough) {
        RestaurantCache cache = cacheRepository.findByPlaceId(place.id())
                .orElseGet(RestaurantCache::new);

        String restaurantName = place.displayName() != null && place.displayName().text() != null
                ? place.displayName().text()
                : place.name();

        cache.setPlaceId(place.id());
        cache.setName(restaurantName);
        cache.setCategory(extractCategory(place.types()));
        cache.setRating(place.rating());
        cache.setPriceLevel(extractPriceLevel(place.priceLevel()));
        cache.setAddress(place.formattedAddress());
        cache.setBorough(borough);
        cache.setUserRatingCount(place.userRatingsTotal());
        cache.setGenerativeSummary(place.generativeSummary());
        cache.setReviewSummary(place.reviewSummary());
        cache.setOpeningHours(place.currentOpeningHours());
        cache.setWebsiteUri(place.websiteUri());

        if (place.location() != null) {
            cache.setLatitude(place.location().latitude());
            cache.setLongitude(place.location().longitude());
        }
        if (place.photos() != null && !place.photos().isEmpty()) {
            cache.setPhotoReferences(place.photos().stream()
                    .map(GooglePlacesSearchResponse.Photo::name)
                    .collect(Collectors.toList()));
        }

        cache.setVibeTags(deriveVibeTags(place, cache.getPriceLevel()));
        cache.refreshExpiration();
        return cacheRepository.save(cache);
    }

    /**
     * Derives descriptive "vibe" tags for a place based on its attributes and price level.
     *
     * @param place the Google Places response place to evaluate
     * @param priceLevel the normalized internal price level (1 = inexpensive, 2 = moderate, 3 = expensive), or null if unknown
     * @return a list of vibe tags (for example: "Date Night", "Group Friendly", "Family Friendly", "Live Music", "Vegetarian", "Brunch", "Casual", "Fine Dining", "Outdoor Seating", "Delivery")
     */
    private List<String> deriveVibeTags(GooglePlacesSearchResponse.Place place, Integer priceLevel) {
        List<String> tags = new ArrayList<>();
        if (Boolean.TRUE.equals(place.servesWine()) || (priceLevel != null && priceLevel >= 3)) {
            tags.add("Date Night");
        }
        if (Boolean.TRUE.equals(place.goodForGroups())) {
            tags.add("Group Friendly");
        }
        if (Boolean.TRUE.equals(place.goodForChildren())) {
            tags.add("Family Friendly");
        }
        if (Boolean.TRUE.equals(place.liveMusic())) {
            tags.add("Live Music");
        }
        if (Boolean.TRUE.equals(place.servesVegetarianFood())) {
            tags.add("Vegetarian");
        }
        if (Boolean.TRUE.equals(place.servesBrunch())) {
            tags.add("Brunch");
        }
        if (priceLevel != null && priceLevel == 1) {
            tags.add("Casual");
        }
        if (priceLevel != null && priceLevel == 3) {
            tags.add("Fine Dining");
        }
        if (Boolean.TRUE.equals(place.outdoorSeating())) {
            tags.add("Outdoor Seating");
        }
        if (Boolean.TRUE.equals(place.delivery())) {
            tags.add("Delivery");
        }
        return tags;
    }

    /**
     * Derives a user-facing cuisine or venue category from a list of Google place types.
     *
     * @param types the list of place type identifiers (e.g., "italian_restaurant", "cafe"); may be null or empty
     * @return the mapped category (e.g., "Italian", "Cafe", "Bar") or "Restaurant" if no specific mapping is found
     */
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

    /**
     * Calculate trending score for a restaurant based on multiple factors
     */
    public double calculateTrendingScore(RestaurantCache restaurant) {
        double score = 0.0;
        
        // Rating trend (40% weight)
        if (restaurant.getRating() != null) {
            score += restaurant.getRating() * 0.4;
        }
        
        // Review velocity (30% weight) 
        if (restaurant.getUserRatingCount() != null) {
            // Normalize review count (more recent reviews = higher score)
            double reviewVelocity = Math.min(restaurant.getUserRatingCount() / 100.0, 5.0);
            score += reviewVelocity * 0.3;
        }
        
        // Recency (20% weight)
        if (restaurant.getLastFetchedAt() != null) {
            long daysSinceUpdate = ChronoUnit.DAYS.between(restaurant.getLastFetchedAt(), Instant.now());
            double recencyScore = Math.max(5.0 - (daysSinceUpdate / 7.0), 0.0);
            score += recencyScore * 0.2;
        }
        
        // Price level popularity (10% weight)
        if (restaurant.getPriceLevel() != null) {
            // Mid-range restaurants tend to be more popular
            double priceScore = restaurant.getPriceLevel() == 2 ? 5.0 : 3.0;
            score += priceScore * 0.1;
        }
        
        return Math.round(score * 100.0) / 100.0; // Round to 2 decimal places
    }
    
    /**
     * Get trending restaurants with calculated scores
     */
    /**
     * Return the top trending restaurants for a borough, ordered by Google's popularity rank.
     * On a cold cache the data is fetched on-demand; otherwise the daily job keeps it fresh.
     */
    public List<RestaurantSummaryDto> getTrendingRestaurants(String borough, int limit) {
        logger.debug("Getting trending restaurants for borough: {} with limit: {}", borough, limit);

        Instant now = Instant.now();
        List<RestaurantCache> ranked = cacheRepository.findTrendingByBorough(
                borough, now, PageRequest.of(0, limit));

        if (ranked.isEmpty()) {
            logger.info("No trending data for borough: {}, fetching from Google Places", borough);
            fetchAndCacheTrendingForBorough(borough);
            ranked = cacheRepository.findTrendingByBorough(borough, now, PageRequest.of(0, limit));
        }

        logger.info("Returning {} trending restaurants for borough: {}", ranked.size(), borough);
        return ranked.stream()
                .map(RestaurantSummaryDto::fromEntity)
                .collect(Collectors.toList());
    }

    /**
     * Fetch popular restaurants from Google Places using their own popularity ranking,
     * then upsert them into restaurant_cache with trendingRank set to their order (1 = most popular).
     */
    @Transactional
    public void fetchAndCacheTrendingForBorough(String borough) {
        TRENDING_BOROUGHS.stream()
                .filter(b -> b.name().equalsIgnoreCase(borough))
                .findFirst()
                .ifPresentOrElse(b -> {
                    try {
                        logger.info("Fetching trending restaurants from Google Places for {}", b.name());
                        GooglePlacesSearchResponse response = placesClient.searchTrending(
                                b.lat(), b.lng(), b.radiusMeters(), 20);

                        List<GooglePlacesSearchResponse.Place> places = response.places();
                        if (places == null || places.isEmpty()) {
                            logger.warn("No results from Google Places trending search for {}", b.name());
                            return;
                        }

                        Instant now = Instant.now();
                        for (int i = 0; i < places.size(); i++) {
                            GooglePlacesSearchResponse.Place place = places.get(i);
                            try {
                                RestaurantCache entry = upsertRestaurantCache(place, b.name());
                                entry.setTrendingRank(i + 1);
                                entry.setTrendingScore(0.0);
                                entry.setLastTrendingCalcAt(now);
                                cacheRepository.save(entry);
                            } catch (Exception e) {
                                logger.error("Error saving trending restaurant {}: {}", place.id(), e.getMessage());
                            }
                        }
                        logger.info("Cached {} trending restaurants for {}", places.size(), b.name());
                    } catch (Exception e) {
                        logger.error("Error fetching trending for borough {}: {}", b.name(), e.getMessage());
                    }
                }, () -> logger.warn("Borough {} not in TRENDING_BOROUGHS, skipping", borough));
    }

    /**
     * Seed the neighborhoods table and ensure each trending borough has initial trending data at application startup.
     *
     * <p>On startup this method seeds predefined neighborhoods if missing, then iterates TRENDING_BOROUGHS:
     * for each borough it checks for existing recent trending entries and triggers a fetch-and-cache of trending
     * places when none are present. Progress and per-borough errors are logged but do not abort the overall process.
     */
    @Async
    @EventListener(ApplicationReadyEvent.class)
    public void seedTrendingOnStartup() {
        logger.info("Checking trending cache and neighborhoods on startup");
        seedNeighborhoods();

        Instant now = Instant.now();
        for (TrendingBorough b : TRENDING_BOROUGHS) {
            try {
                List<RestaurantCache> existing = cacheRepository.findTrendingByBorough(
                        b.name(), now, PageRequest.of(0, 1));
                if (existing.isEmpty()) {
                    logger.info("No trending data for {} — seeding on startup", b.name());
                    fetchAndCacheTrendingForBorough(b.name());
                } else {
                    logger.info("Trending data already present for {}, skipping seed", b.name());
                }
            } catch (Exception e) {
                logger.error("Startup seed failed for {}: {}", b.name(), e.getMessage());
            }
        }
    }

    /**
     * Seed the database with a predefined set of neighborhoods if the neighborhoods table is empty.
     *
     * <p>Checks the NeighborhoodRepository; if no neighborhoods exist, inserts a fixed list of 30
     * neighborhood records spanning Manhattan, Brooklyn, and Queens and logs the seeded count. If
     * neighborhoods already exist, the method returns without making changes.
     */
    private void seedNeighborhoods() {
        if (neighborhoodRepository.count() > 0) {
            logger.info("Neighborhoods already seeded, skipping");
            return;
        }
        logger.info("Seeding 30 neighborhoods");
        List<Neighborhood> neighborhoods = List.of(
            // Manhattan (display order 0-9)
            new Neighborhood("SoHo",              "Manhattan", 40.7233, -74.0030, 1000, 0),
            new Neighborhood("Greenwich Village",  "Manhattan", 40.7335, -74.0027, 1000, 1),
            new Neighborhood("Upper East Side",    "Manhattan", 40.7736, -73.9566, 1000, 2),
            new Neighborhood("Midtown",            "Manhattan", 40.7549, -73.9840, 1000, 3),
            new Neighborhood("Lower East Side",    "Manhattan", 40.7153, -73.9864, 1000, 4),
            new Neighborhood("Chelsea",            "Manhattan", 40.7465, -74.0014, 1000, 5),
            new Neighborhood("Tribeca",            "Manhattan", 40.7179, -74.0087, 1000, 6),
            new Neighborhood("East Village",       "Manhattan", 40.7265, -73.9815, 1000, 7),
            new Neighborhood("West Village",       "Manhattan", 40.7351, -74.0023, 1000, 8),
            new Neighborhood("Financial District", "Manhattan", 40.7074, -74.0113, 1000, 9),
            // Brooklyn (display order 0-9)
            new Neighborhood("Williamsburg",       "Brooklyn",  40.7081, -73.9571, 1000, 0),
            new Neighborhood("DUMBO",              "Brooklyn",  40.7033, -73.9892, 1000, 1),
            new Neighborhood("Park Slope",         "Brooklyn",  40.6726, -73.9785, 1000, 2),
            new Neighborhood("Bushwick",           "Brooklyn",  40.6944, -73.9213, 1000, 3),
            new Neighborhood("Crown Heights",      "Brooklyn",  40.6692, -73.9443, 1000, 4),
            new Neighborhood("Red Hook",           "Brooklyn",  40.6765, -74.0078, 1000, 5),
            new Neighborhood("Sunset Park",        "Brooklyn",  40.6524, -74.0050, 1000, 6),
            new Neighborhood("Bay Ridge",          "Brooklyn",  40.6348, -74.0260, 1000, 7),
            new Neighborhood("Prospect Heights",   "Brooklyn",  40.6773, -73.9681, 1000, 8),
            new Neighborhood("Carroll Gardens",    "Brooklyn",  40.6788, -73.9995, 1000, 9),
            // Queens (display order 0-9)
            new Neighborhood("Astoria",            "Queens",    40.7721, -73.9301, 1000, 0),
            new Neighborhood("Long Island City",   "Queens",    40.7447, -73.9484, 1000, 1),
            new Neighborhood("Flushing",           "Queens",    40.7675, -73.8330, 1000, 2),
            new Neighborhood("Jackson Heights",    "Queens",    40.7556, -73.8830, 1000, 3),
            new Neighborhood("Forest Hills",       "Queens",    40.7212, -73.8485, 1000, 4),
            new Neighborhood("Elmhurst",           "Queens",    40.7370, -73.8794, 1000, 5),
            new Neighborhood("Woodside",           "Queens",    40.7477, -73.9027, 1000, 6),
            new Neighborhood("Sunnyside",          "Queens",    40.7440, -73.9187, 1000, 7),
            new Neighborhood("Corona",             "Queens",    40.7519, -73.8656, 1000, 8),
            new Neighborhood("Ridgewood",          "Queens",    40.7047, -73.9054, 1000, 9)
        );
        neighborhoodRepository.saveAll(neighborhoods);
        logger.info("Seeded {} neighborhoods", neighborhoods.size());
    }

    /**
     * Runs a scheduled daily refresh of trending data for all configured trending boroughs.
     *
     * <p>Executes once per day at 03:00 server time. Each borough's refresh is attempted independently;
     * failures for a single borough are caught and logged without aborting the remaining refreshes.
     */
    @Scheduled(cron = "0 0 3 * * *")
    public void refreshAllTrendingBoroughs() {
        logger.info("Starting scheduled trending refresh for all boroughs");
        for (TrendingBorough b : TRENDING_BOROUGHS) {
            try {
                fetchAndCacheTrendingForBorough(b.name());
            } catch (Exception e) {
                logger.error("Scheduled trending refresh failed for {}: {}", b.name(), e.getMessage());
            }
        }
        logger.info("Completed scheduled trending refresh");
    }

    /**
     * Get neighborhoods for a specific borough
     */
    public List<String> getNeighborhoodsForBorough(String borough) {
        return BOROUGH_NEIGHBORHOODS.getOrDefault(borough, List.of());
    }
    
    /**
     * Update trending scores for all restaurants in a borough
     */
    @Transactional
    public void updateTrendingScores(String borough) {
        logger.info("Updating trending scores for borough: {}", borough);
        
        try {
            Instant now = Instant.now();
            List<RestaurantCache> restaurants = cacheRepository.findByBoroughNotExpired(
                borough, now, PageRequest.of(0, 1000) // Process in batches
            ).getContent();
            
            if (restaurants.isEmpty()) {
                logger.warn("No restaurants found to update trending scores for borough: {}", borough);
                return;
            }
            
            logger.info("Found {} restaurants to update in borough: {}", restaurants.size(), borough);
            
            // Calculate scores and update ranks
            restaurants.sort((r1, r2) -> {
                double score1 = calculateTrendingScore(r1);
                double score2 = calculateTrendingScore(r2);
                return Double.compare(score2, score1); // Descending order
            });
            
            // Update trending scores and ranks
            for (int i = 0; i < restaurants.size(); i++) {
                RestaurantCache restaurant = restaurants.get(i);
                double score = calculateTrendingScore(restaurant);
                restaurant.setTrendingScore(score);
                restaurant.setTrendingRank(i + 1);
                restaurant.setLastTrendingCalcAt(now);
                logger.debug("Restaurant: {} - Score: {} - Rank: {}", 
                            restaurant.getName(), score, i + 1);
            }
            
            // Save updated restaurants
            cacheRepository.saveAll(restaurants);
            
            logger.info("Updated trending scores for {} restaurants in borough: {}", 
                       restaurants.size(), borough);
                       
        } catch (Exception e) {
            logger.error("Error updating trending scores for borough {}: {}", borough, e.getMessage(), e);
            throw new RuntimeException("Failed to update trending scores: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get trending statistics for a borough
     */
    public TrendingStats getTrendingStats(String borough) {
        Instant now = Instant.now();
        List<Object[]> stats = cacheRepository.getTrendingStats(borough, now);
        
        if (stats.isEmpty()) {
            return new TrendingStats(0.0, 0.0, 0.0, 0L);
        }
        
        Object[] result = stats.get(0);
        Double minScore = (Double) result[0];
        Double maxScore = (Double) result[1];
        Double avgScore = (Double) result[2];
        Long count = (Long) result[3];
        
        return new TrendingStats(
            minScore != null ? minScore : 0.0,
            maxScore != null ? maxScore : 0.0,
            avgScore != null ? avgScore : 0.0,
            count != null ? count : 0L
        );
    }
    
    /**
     * Update trending scores for all boroughs (scheduled method)
     */
    @Transactional
    public void updateAllTrendingScores() {
        logger.info("Starting scheduled trending scores update for all boroughs");
        
        List<String> boroughs = BOROUGH_NEIGHBORHOODS.keySet().stream().toList();
        
        for (String borough : boroughs) {
            try {
                updateTrendingScores(borough);
                logger.info("Updated trending scores for borough: {}", borough);
            } catch (Exception e) {
                logger.error("Error updating trending scores for borough {}: {}", borough, e.getMessage());
            }
        }
        
        logger.info("Completed scheduled trending scores update for all boroughs");
    }
    
    /**
     * Clean up old trending calculations (older than 7 days)
     */
    @Transactional
    public void cleanupOldTrendingData() {
        Instant threshold = Instant.now().minusSeconds(7 * 24 * 60 * 60); // 7 days ago
        int cleared = cacheRepository.clearOldTrendingData(threshold);
        logger.info("Cleared trending data for {} restaurants older than 7 days", cleared);
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
    
    public record TrendingStats(
        double minScore,
        double maxScore,
        double avgScore,
        long totalRestaurants
    ) {}
} 