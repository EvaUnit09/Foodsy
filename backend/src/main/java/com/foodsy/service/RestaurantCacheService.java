package com.foodsy.service;

import com.foodsy.client.GooglePlacesClient;
import com.foodsy.domain.Neighborhood;
import com.foodsy.domain.RestaurantCache;
import com.foodsy.domain.User;
import com.foodsy.domain.UserDailyFeed;
import com.foodsy.dto.GooglePlacesSearchResponse;
import com.foodsy.dto.RestaurantSummaryDto;
import com.foodsy.repository.NeighborhoodRepository;
import com.foodsy.repository.RestaurantCacheRepository;
import com.foodsy.repository.UserDailyFeedRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Random;
import java.util.Set;
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
        new TrendingBorough("Brooklyn",  40.6782, -73.9442, 5000)
    );

    // Bounding boxes for borough-level filtering: drop anything returned by Google Places
    // that actually falls outside the target borough.
    private record BoroughBbox(double latMin, double latMax, double lngMin, double lngMax) {}
    private static final Map<String, BoroughBbox> BOROUGH_BBOXES = Map.of(
        "Manhattan", new BoroughBbox(40.699, 40.882, -74.022, -73.907),
        "Brooklyn",  new BoroughBbox(40.551, 40.739, -74.042, -73.833),
        "Queens",    new BoroughBbox(40.541, 40.800, -73.962, -73.700)
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
    private UserDailyFeedRepository dailyFeedRepository;

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
     * Get randomised restaurants for the discovery swipe feature (lower rating floor than spotlight).
     * When a neighborhood is specified, fetches from that neighborhood's coordinates if the cache is cold.
     * Uses a per-borough in-flight gate so only the first caller triggers a cache-warming fetch.
     */
    public List<RestaurantSummaryDto> getDiscoveryRestaurants(String borough, String neighborhood, int limit) {
        logger.debug("Getting discovery restaurants for borough: {}, neighborhood: {}", borough, neighborhood);

        Instant now = Instant.now();
        List<RestaurantCache> results = cacheRepository.findDiscoveryRestaurants(borough, neighborhood, now, 3.5, limit);

        if (!results.isEmpty()) {
            return results.stream().map(RestaurantSummaryDto::fromEntity).collect(Collectors.toList());
        }

        // Before hitting the API, try the borough-wide pool (ignoring neighborhood filter).
        // This avoids triggering a Google API call when we already have data at the borough level.
        if (neighborhood != null) {
            List<RestaurantCache> boroughFallback = cacheRepository
                    .findDiscoveryRestaurants(borough, null, now, 3.5, limit);
            if (!boroughFallback.isEmpty()) {
                logger.info("Neighborhood '{}' cache cold — serving {} from borough pool", neighborhood, boroughFallback.size());
                return boroughFallback.stream().map(RestaurantSummaryDto::fromEntity).collect(Collectors.toList());
            }
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
     * Returns a deterministic, personalized set of restaurants for the given user and borough.
     * The same set is served all day; it changes the next calendar day.
     * Authenticated users are routed here from RestaurantController.
     */
    @Transactional
    public List<RestaurantSummaryDto> getDailyUserFeed(User user, String borough, int limit) {
        LocalDate today = LocalDate.now();

        Optional<UserDailyFeed> existing = dailyFeedRepository
                .findByUserIdAndFeedDateAndBorough(user.getId(), today, borough);
        if (existing.isPresent()) {
            List<String> ids = Arrays.asList(existing.get().getPlaceIds().split(","));
            List<RestaurantCache> rows = cacheRepository.findByPlaceIdIn(ids);
            Map<String, RestaurantCache> byId = rows.stream()
                    .collect(Collectors.toMap(RestaurantCache::getPlaceId, r -> r));
            return ids.stream()
                    .map(byId::get)
                    .filter(Objects::nonNull)
                    .map(RestaurantSummaryDto::fromEntity)
                    .collect(Collectors.toList());
        }

        List<RestaurantCache> pool = cacheRepository
                .findByBoroughNotExpired(borough, Instant.now(), PageRequest.of(0, 200))
                .getContent();

        if (pool.isEmpty()) {
            logger.info("Borough pool empty for {} — falling back to random discovery", borough);
            return getDiscoveryRestaurants(borough, null, limit);
        }

        List<RestaurantCache> selected = deterministicShuffle(pool, user.getId())
                .stream().limit(limit).collect(Collectors.toList());

        String csv = selected.stream()
                .map(RestaurantCache::getPlaceId)
                .collect(Collectors.joining(","));
        UserDailyFeed feed = new UserDailyFeed();
        feed.setUser(user);
        feed.setFeedDate(today);
        feed.setBorough(borough);
        feed.setPlaceIds(csv);
        dailyFeedRepository.save(feed);

        return selected.stream().map(RestaurantSummaryDto::fromEntity).collect(Collectors.toList());
    }

    /**
     * Deterministic shuffle: same userId + same calendar day → same ordering.
     * Different users or different days → different ordering.
     */
    private List<RestaurantCache> deterministicShuffle(List<RestaurantCache> pool, Long userId) {
        long seed = (long) userId.hashCode() * 31L + LocalDate.now().toEpochDay();
        List<RestaurantCache> copy = new ArrayList<>(pool);
        Collections.shuffle(copy, new Random(seed));
        return copy;
    }

    private boolean isWithinNeighborhoodBbox(GooglePlacesSearchResponse.Place place, Neighborhood nb) {
        if (!nb.hasBbox() || place.location() == null) return true;
        double lat = place.location().latitude();
        double lng = place.location().longitude();
        return lat >= nb.getBboxLatMin() && lat <= nb.getBboxLatMax()
            && lng >= nb.getBboxLngMin() && lng <= nb.getBboxLngMax();
    }

    private boolean isWithinBoroughBbox(GooglePlacesSearchResponse.Place place, String borough) {
        BoroughBbox bbox = BOROUGH_BBOXES.get(borough);
        if (bbox == null || place.location() == null) return true;
        double lat = place.location().latitude();
        double lng = place.location().longitude();
        return lat >= bbox.latMin() && lat <= bbox.latMax()
            && lng >= bbox.lngMin() && lng <= bbox.lngMax();
    }

    /**
     * Fetch restaurants from Google Places for a specific neighborhood, using its stored coordinates.
     *
     * Not @Transactional at this level so each upsertRestaurantCache runs in its own transaction (#11).
     */
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
            // Check quota before calling upstream (#8)
            if (!canMakeApiCall() || !canMakeNearbySearchCall()) {
                logger.warn("API quota exceeded, skipping fetch for neighborhood {}", nb.getName());
                return;
            }
            nearbySearchCalls.incrementAndGet();
            dailyApiCalls.incrementAndGet();
            logger.info("Fetching places for neighborhood {} ({}, {}) radius {}m",
                    nb.getName(), nb.getCenterLat(), nb.getCenterLng(), nb.getRadiusMeters());
            GooglePlacesSearchResponse response = placesClient.searchTrending(
                    nb.getCenterLat(), nb.getCenterLng(), nb.getRadiusMeters(), 20);

            List<GooglePlacesSearchResponse.Place> places = response.places();
            if (places == null || places.isEmpty()) {
                logger.warn("No results from Google Places for neighborhood {}", nb.getName());
                return;
            }

            places = places.stream()
                    .filter(p -> isWithinNeighborhoodBbox(p, nb))
                    .toList();
            logger.debug("After bbox filter: {} places remain for neighborhood {}", places.size(), nb.getName());

            Instant now = Instant.now();
            for (int i = 0; i < places.size(); i++) {
                try {
                    RestaurantCache entry = upsertRestaurantCache(places.get(i), borough);
                    entry.setNeighborhood(nb.getName());
                    entry.setTrendingRank(i + 1);
                    entry.setTrendingScore(0.0);
                    entry.setLastTrendingCalcAt(now);
                    cacheRepository.save(entry);
                } catch (DataIntegrityViolationException | jakarta.validation.ConstraintViolationException e) {
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
     * Fetch restaurants from API and cache them.
     * Not @Transactional at this level so each upsertRestaurantCache runs in its own transaction;
     * a single bad place doesn't roll back the entire batch.
     */
    public List<RestaurantSummaryDto> fetchAndCacheForBorough(String borough, int limit) {
        if (!canMakeApiCall() || !canMakeNearbySearchCall()) {
            logger.warn("API quota exceeded, cannot fetch restaurants for borough: {}", borough);
            return List.of();
        }

        try {
            logger.info("Fetching restaurants from Places API for borough: {}", borough);

            BoroughCoordinates coords = getBoroughCoordinates(borough);
            nearbySearchCalls.incrementAndGet();
            dailyApiCalls.incrementAndGet();

            GooglePlacesSearchResponse response = placesClient.searchNearby(
                coords.latitude(), coords.longitude(), 5000.0, limit);

            List<GooglePlacesSearchResponse.Place> places = response.places();
            if (places == null || places.isEmpty()) {
                return List.of();
            }

            places = places.stream()
                .filter(p -> isWithinBoroughBbox(p, borough))
                .toList();
            logger.debug("After bbox filter: {} places remain for borough {}", places.size(), borough);

            List<RestaurantSummaryDto> results = new ArrayList<>();
            for (GooglePlacesSearchResponse.Place place : places) {
                try {
                    results.add(RestaurantSummaryDto.fromEntity(upsertRestaurantCache(place, borough)));
                } catch (DataIntegrityViolationException | jakarta.validation.ConstraintViolationException e) {
                    logger.error("Error saving restaurant {}: {}", place.id(), e.getMessage());
                }
            }

            logger.info("Successfully fetched and cached {} restaurants for borough: {}",
                       results.size(), borough);
            return results;

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
    
    @Scheduled(cron = "0 0 0 * * *")
    public void resetDailyCounters() {
        logger.info("Resetting daily API call counters");
        dailyApiCalls.set(0);
        nearbySearchCalls.set(0);
        placeDetailsCalls.set(0);

        int deleted = dailyFeedRepository.deleteOlderThan(LocalDate.now().minusDays(7));
        logger.info("Deleted {} stale user_daily_feed rows", deleted);
    }

    // Helper methods
    private List<RestaurantCache> combineAndLimitResults(
        List<RestaurantCache> existing,
        List<RestaurantCache> newResults,
        int limit
    ) {
        // Merge both lists, deduplicating by placeId, then apply limit (#5)
        java.util.Set<String> seenIds = existing.stream()
            .map(RestaurantCache::getPlaceId)
            .collect(Collectors.toCollection(java.util.LinkedHashSet::new));
        List<RestaurantCache> combined = new ArrayList<>(existing);
        for (RestaurantCache r : newResults) {
            if (seenIds.add(r.getPlaceId())) {
                combined.add(r);
            }
        }
        return combined.stream().limit(limit).collect(Collectors.toList());
    }

    /**
     * Find-or-create a RestaurantCache row by place_id (upsert), then populate all fields.
     * Using find-or-create everywhere means we never INSERT a duplicate place_id row.
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
     *
     * Not @Transactional at this level: each upsertRestaurantCache call runs in its own transaction
     * so a single failure doesn't roll back the entire batch (#11).
     */
    public void fetchAndCacheTrendingForBorough(String borough) {
        TRENDING_BOROUGHS.stream()
                .filter(b -> b.name().equalsIgnoreCase(borough))
                .findFirst()
                .ifPresentOrElse(b -> {
                    try {
                        // Check quota before calling upstream (#8)
                        if (!canMakeApiCall() || !canMakeNearbySearchCall()) {
                            logger.warn("API quota exceeded, skipping trending fetch for {}", b.name());
                            return;
                        }
                        nearbySearchCalls.incrementAndGet();
                        dailyApiCalls.incrementAndGet();
                        logger.info("Fetching trending restaurants from Google Places for {}", b.name());
                        GooglePlacesSearchResponse response = placesClient.searchTrending(
                                b.lat(), b.lng(), b.radiusMeters(), 20);

                        List<GooglePlacesSearchResponse.Place> places = response.places();
                        if (places == null || places.isEmpty()) {
                            logger.warn("No results from Google Places trending search for {}", b.name());
                            return;
                        }

                        places = places.stream()
                                .filter(p -> isWithinBoroughBbox(p, b.name()))
                                .toList();
                        logger.debug("After bbox filter: {} places remain for borough {}", places.size(), b.name());

                        Instant now = Instant.now();
                        for (int i = 0; i < places.size(); i++) {
                            GooglePlacesSearchResponse.Place place = places.get(i);
                            try {
                                RestaurantCache entry = upsertRestaurantCache(place, b.name());
                                entry.setTrendingRank(i + 1);
                                entry.setTrendingScore(0.0);
                                entry.setLastTrendingCalcAt(now);
                                cacheRepository.save(entry);
                            } catch (DataIntegrityViolationException | jakarta.validation.ConstraintViolationException e) {
                                logger.error("Error saving trending restaurant {}: {}", place.id(), e.getMessage());
                            }
                        }
                        logger.info("Cached {} trending restaurants for {}", places.size(), b.name());
                    } catch (Exception e) {
                        logger.error("Error fetching trending for borough {}: {}", b.name(), e.getMessage());
                    }
                }, () -> logger.warn("Borough {} not in TRENDING_BOROUGHS, skipping", borough));
    }

    /** On startup, seed neighborhoods table and any borough without trending data. Runs async. */
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

        seedAllNeighborhoods();
    }

    /**
     * Seed restaurant data for any neighborhood that has no cached entries.
     * Called once at startup — subsequent restarts skip all 30 since the pool is populated.
     */
    private void seedAllNeighborhoods() {
        Instant now = Instant.now();
        List<Neighborhood> all = neighborhoodRepository.findAll();
        logger.info("Checking neighborhood pool coverage for {} neighborhoods", all.size());
        for (Neighborhood nb : all) {
            try {
                long count = cacheRepository.countByBoroughAndNeighborhoodNotExpired(
                        nb.getBorough(), nb.getName(), now);
                if (count == 0) {
                    logger.info("Seeding neighborhood {} ({})", nb.getName(), nb.getBorough());
                    fetchAndCacheForNeighborhood(nb.getBorough(), nb.getName());
                }
            } catch (Exception e) {
                logger.warn("Failed to seed neighborhood {} ({}): {}", nb.getName(), nb.getBorough(), e.getMessage());
            }
        }
        logger.info("Neighborhood pool seeding complete");
    }

    @Transactional
    private void seedNeighborhoods() {
        // constructor: name, borough, centerLat, centerLng, radiusMeters, displayOrder,
        //              bboxLatMin, bboxLatMax, bboxLngMin, bboxLngMax
        List<Neighborhood> templates = List.of(
            // Manhattan
            new Neighborhood("SoHo",              "Manhattan", 40.7233, -74.0030, 1000, 0,  40.718, 40.730, -74.010, -73.995),
            new Neighborhood("Greenwich Village",  "Manhattan", 40.7335, -74.0027, 1000, 1,  40.726, 40.738, -74.010, -73.993),
            new Neighborhood("Upper East Side",    "Manhattan", 40.7736, -73.9566, 1000, 2,  40.762, 40.784, -73.965, -73.939),
            new Neighborhood("Midtown",            "Manhattan", 40.7549, -73.9840, 1000, 3,  40.747, 40.762, -73.997, -73.969),
            new Neighborhood("Lower East Side",    "Manhattan", 40.7153, -73.9864, 1000, 4,  40.710, 40.723, -73.993, -73.970),
            new Neighborhood("Chelsea",            "Manhattan", 40.7465, -74.0014, 1000, 5,  40.739, 40.753, -74.010, -73.990),
            new Neighborhood("Tribeca",            "Manhattan", 40.7179, -74.0087, 1000, 6,  40.714, 40.724, -74.018, -74.002),
            new Neighborhood("East Village",       "Manhattan", 40.7265, -73.9815, 1000, 7,  40.720, 40.733, -73.993, -73.970),
            new Neighborhood("West Village",       "Manhattan", 40.7351, -74.0023, 1000, 8,  40.729, 40.739, -74.010, -73.997),
            new Neighborhood("Financial District", "Manhattan", 40.7074, -74.0113, 1000, 9,  40.699, 40.712, -74.022, -74.000),
            // Brooklyn
            new Neighborhood("Williamsburg",       "Brooklyn",  40.7081, -73.9571, 1000, 0,  40.696, 40.720, -73.974, -73.933),
            new Neighborhood("DUMBO",              "Brooklyn",  40.7033, -73.9892, 1000, 1,  40.697, 40.706, -73.994, -73.980),
            new Neighborhood("Park Slope",         "Brooklyn",  40.6726, -73.9785, 1000, 2,  40.659, 40.681, -73.991, -73.966),
            new Neighborhood("Bushwick",           "Brooklyn",  40.6944, -73.9213, 1000, 3,  40.683, 40.709, -73.934, -73.901),
            new Neighborhood("Crown Heights",      "Brooklyn",  40.6692, -73.9443, 1000, 4,  40.656, 40.678, -73.958, -73.926),
            new Neighborhood("Red Hook",           "Brooklyn",  40.6765, -74.0078, 1000, 5,  40.670, 40.683, -74.016, -73.996),
            new Neighborhood("Sunset Park",        "Brooklyn",  40.6524, -74.0050, 1000, 6,  40.640, 40.659, -74.013, -73.990),
            new Neighborhood("Bay Ridge",          "Brooklyn",  40.6348, -74.0260, 1000, 7,  40.619, 40.648, -74.045, -74.012),
            new Neighborhood("Prospect Heights",   "Brooklyn",  40.6773, -73.9681, 1000, 8,  40.669, 40.682, -73.979, -73.957),
            new Neighborhood("Carroll Gardens",    "Brooklyn",  40.6788, -73.9995, 1000, 9,  40.671, 40.685, -74.006, -73.988),
            // Queens
            new Neighborhood("Astoria",            "Queens",    40.7721, -73.9301, 1000, 0,  40.759, 40.783, -73.948, -73.903),
            new Neighborhood("Long Island City",   "Queens",    40.7447, -73.9484, 1000, 1,  40.737, 40.756, -73.961, -73.930),
            new Neighborhood("Flushing",           "Queens",    40.7675, -73.8330, 1000, 2,  40.755, 40.779, -73.849, -73.815),
            new Neighborhood("Jackson Heights",    "Queens",    40.7556, -73.8830, 1000, 3,  40.745, 40.763, -73.897, -73.870),
            new Neighborhood("Forest Hills",       "Queens",    40.7212, -73.8485, 1000, 4,  40.712, 40.729, -73.861, -73.833),
            new Neighborhood("Elmhurst",           "Queens",    40.7370, -73.8794, 1000, 5,  40.729, 40.746, -73.892, -73.860),
            new Neighborhood("Woodside",           "Queens",    40.7477, -73.9027, 1000, 6,  40.740, 40.757, -73.917, -73.892),
            new Neighborhood("Sunnyside",          "Queens",    40.7440, -73.9187, 1000, 7,  40.737, 40.751, -73.930, -73.910),
            new Neighborhood("Corona",             "Queens",    40.7519, -73.8656, 1000, 8,  40.742, 40.759, -73.878, -73.851),
            new Neighborhood("Ridgewood",          "Queens",    40.7047, -73.9054, 1000, 9,  40.697, 40.713, -73.921, -73.891)
        );

        long count = neighborhoodRepository.count();
        if (count == 0) {
            neighborhoodRepository.saveAll(templates);
            logger.info("Seeded {} neighborhoods", templates.size());
            return;
        }

        // Migration: backfill bbox values and insert any template rows missing from the DB.
        Map<String, Neighborhood> templateMap = templates.stream().collect(
            Collectors.toMap(n -> n.getName().toLowerCase() + "|" + n.getBorough().toLowerCase(), n -> n));
        List<Neighborhood> existing = neighborhoodRepository.findAll();
        Set<String> existingKeys = existing.stream()
            .map(n -> n.getName().toLowerCase() + "|" + n.getBorough().toLowerCase())
            .collect(Collectors.toSet());

        boolean anyUpdated = false;
        for (Neighborhood nb : existing) {
            if (nb.hasBbox()) continue;
            Neighborhood tmpl = templateMap.get(nb.getName().toLowerCase() + "|" + nb.getBorough().toLowerCase());
            if (tmpl != null) {
                nb.setBboxLatMin(tmpl.getBboxLatMin());
                nb.setBboxLatMax(tmpl.getBboxLatMax());
                nb.setBboxLngMin(tmpl.getBboxLngMin());
                nb.setBboxLngMax(tmpl.getBboxLngMax());
                neighborhoodRepository.save(nb);
                anyUpdated = true;
            }
        }
        if (anyUpdated) {
            logger.info("Backfilled bbox values for existing neighborhoods");
        }

        List<Neighborhood> missing = templates.stream()
            .filter(t -> !existingKeys.contains(t.getName().toLowerCase() + "|" + t.getBorough().toLowerCase()))
            .collect(Collectors.toList());
        if (!missing.isEmpty()) {
            neighborhoodRepository.saveAll(missing);
            logger.info("Inserted {} missing neighborhood(s)", missing.size());
        } else if (!anyUpdated) {
            logger.info("Neighborhoods already fully seeded, skipping");
        }
    }

    /** Daily job: refresh trending data for all three boroughs at 3 AM server time. */
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