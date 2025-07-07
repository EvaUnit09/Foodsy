package com.foodiefriends.backend.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.concurrent.atomic.AtomicLong;

@Service
public class ApiQuotaService {

    private static final Logger logger = LoggerFactory.getLogger(ApiQuotaService.class);

    // Conservative limits (60% of Google Places API free tier)
    private static final int MONTHLY_NEARBY_SEARCH_LIMIT = 3000; // 60% of 5,000
    private static final int MONTHLY_PLACE_DETAILS_LIMIT = 6000; // 60% of 10,000
    private static final int MONTHLY_AUTOCOMPLETE_LIMIT = 6000; // 60% of 10,000
    
    // Daily limits (spread evenly across 30 days)
    private static final int DAILY_NEARBY_SEARCH_LIMIT = 100; // 3000/30
    private static final int DAILY_PLACE_DETAILS_LIMIT = 200; // 6000/30  
    private static final int DAILY_AUTOCOMPLETE_LIMIT = 200; // 6000/30

    // Circuit breaker limits (pause API calls when approaching limits)
    private static final double CIRCUIT_BREAKER_THRESHOLD = 0.8; // 80% of limit
    private static final long CIRCUIT_BREAKER_RESET_MINUTES = 60; // 1 hour

    // Track usage by month and day
    private final ConcurrentHashMap<String, AtomicInteger> monthlyUsage = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<String, AtomicInteger> dailyUsage = new ConcurrentHashMap<>();
    
    // Circuit breaker state
    private final ConcurrentHashMap<String, CircuitBreakerState> circuitBreakers = new ConcurrentHashMap<>();

    // Total counters for monitoring
    private final AtomicLong totalNearbySearchCalls = new AtomicLong(0);
    private final AtomicLong totalPlaceDetailsCalls = new AtomicLong(0);
    private final AtomicLong totalAutocompleteCalls = new AtomicLong(0);
    private final AtomicLong totalRejectedCalls = new AtomicLong(0);

    /**
     * Check if a Nearby Search Pro API call can be made
     */
    public boolean canMakeNearbySearchCall() {
        return canMakeCall(ApiType.NEARBY_SEARCH);
    }

    /**
     * Check if a Place Details API call can be made
     */
    public boolean canMakePlaceDetailsCall() {
        return canMakeCall(ApiType.PLACE_DETAILS);
    }

    /**
     * Check if an Autocomplete API call can be made
     */
    public boolean canMakeAutocompleteCall() {
        return canMakeCall(ApiType.AUTOCOMPLETE);
    }

    /**
     * Record a successful Nearby Search API call
     */
    public void recordNearbySearchCall() {
        recordCall(ApiType.NEARBY_SEARCH);
        totalNearbySearchCalls.incrementAndGet();
    }

    /**
     * Record a successful Place Details API call
     */
    public void recordPlaceDetailsCall() {
        recordCall(ApiType.PLACE_DETAILS);
        totalPlaceDetailsCalls.incrementAndGet();
    }

    /**
     * Record a successful Autocomplete API call
     */
    public void recordAutocompleteCall() {
        recordCall(ApiType.AUTOCOMPLETE);
        totalAutocompleteCalls.incrementAndGet();
    }

    /**
     * Record a rejected API call (for monitoring)
     */
    public void recordRejectedCall() {
        totalRejectedCalls.incrementAndGet();
    }

    /**
     * Get current usage statistics
     */
    public QuotaUsageStats getUsageStats() {
        YearMonth currentMonth = YearMonth.now();
        LocalDate currentDate = LocalDate.now();

        return new QuotaUsageStats(
            getMonthlyUsage(ApiType.NEARBY_SEARCH, currentMonth),
            MONTHLY_NEARBY_SEARCH_LIMIT,
            getDailyUsage(ApiType.NEARBY_SEARCH, currentDate),
            DAILY_NEARBY_SEARCH_LIMIT,
            getMonthlyUsage(ApiType.PLACE_DETAILS, currentMonth),
            MONTHLY_PLACE_DETAILS_LIMIT,
            getDailyUsage(ApiType.PLACE_DETAILS, currentDate),
            DAILY_PLACE_DETAILS_LIMIT,
            getMonthlyUsage(ApiType.AUTOCOMPLETE, currentMonth),
            MONTHLY_AUTOCOMPLETE_LIMIT,
            getDailyUsage(ApiType.AUTOCOMPLETE, currentDate),
            DAILY_AUTOCOMPLETE_LIMIT,
            totalNearbySearchCalls.get(),
            totalPlaceDetailsCalls.get(),
            totalAutocompleteCalls.get(),
            totalRejectedCalls.get(),
            getCircuitBreakerStatus()
        );
    }

    /**
     * Get quota health status
     */
    public QuotaHealthStatus getHealthStatus() {
        QuotaUsageStats stats = getUsageStats();
        
        // Calculate usage percentages
        double nearbySearchMonthlyPercent = (double) stats.nearbySearchMonthlyUsage / stats.nearbySearchMonthlyLimit;
        double placeDetailsMonthlyPercent = (double) stats.placeDetailsMonthlyUsage / stats.placeDetailsMonthlyLimit;
        double autocompleteMonthlyPercent = (double) stats.autocompleteMonthlyUsage / stats.autocompleteMonthlyLimit;
        
        double nearbySearchDailyPercent = (double) stats.nearbySearchDailyUsage / stats.nearbySearchDailyLimit;
        double placeDetailsDailyPercent = (double) stats.placeDetailsDailyUsage / stats.placeDetailsDailyLimit;
        double autocompleteDailyPercent = (double) stats.autocompleteDailyUsage / stats.autocompleteDailyLimit;
        
        // Determine overall health
        double maxUsagePercent = Math.max(
            Math.max(nearbySearchMonthlyPercent, placeDetailsMonthlyPercent),
            Math.max(autocompleteMonthlyPercent, 
                Math.max(nearbySearchDailyPercent, 
                    Math.max(placeDetailsDailyPercent, autocompleteDailyPercent)))
        );
        
        QuotaHealthLevel healthLevel;
        if (maxUsagePercent >= 0.9) {
            healthLevel = QuotaHealthLevel.CRITICAL;
        } else if (maxUsagePercent >= 0.7) {
            healthLevel = QuotaHealthLevel.WARNING;
        } else if (maxUsagePercent >= 0.5) {
            healthLevel = QuotaHealthLevel.MODERATE;
        } else {
            healthLevel = QuotaHealthLevel.HEALTHY;
        }
        
        return new QuotaHealthStatus(
            healthLevel,
            maxUsagePercent,
            nearbySearchMonthlyPercent,
            placeDetailsMonthlyPercent,
            autocompleteMonthlyPercent,
            stats.totalRejectedCalls > 0
        );
    }

    /**
     * Reset circuit breaker for a specific API type
     */
    public void resetCircuitBreaker(ApiType apiType) {
        String key = apiType.name();
        circuitBreakers.remove(key);
        logger.info("Circuit breaker reset for API type: {}", apiType);
    }

    /**
     * Reset all circuit breakers
     */
    public void resetAllCircuitBreakers() {
        circuitBreakers.clear();
        logger.info("All circuit breakers reset");
    }

    /**
     * Force enable API calls (emergency override)
     */
    public void enableEmergencyMode() {
        resetAllCircuitBreakers();
        logger.warn("Emergency mode enabled - all quota checks bypassed");
    }

    // Private helper methods
    private boolean canMakeCall(ApiType apiType) {
        // Check if circuit breaker is open
        if (isCircuitBreakerOpen(apiType)) {
            logger.debug("Circuit breaker is open for {}, rejecting call", apiType);
            recordRejectedCall();
            return false;
        }

        // Check daily limits
        if (isOverDailyLimit(apiType)) {
            logger.debug("Daily limit reached for {}, rejecting call", apiType);
            recordRejectedCall();
            return false;
        }

        // Check monthly limits
        if (isOverMonthlyLimit(apiType)) {
            logger.debug("Monthly limit reached for {}, rejecting call", apiType);
            recordRejectedCall();
            return false;
        }

        return true;
    }

    private void recordCall(ApiType apiType) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate currentDate = LocalDate.now();

        // Update monthly usage
        String monthlyKey = getMonthlyKey(apiType, currentMonth);
        monthlyUsage.computeIfAbsent(monthlyKey, k -> new AtomicInteger(0)).incrementAndGet();

        // Update daily usage
        String dailyKey = getDailyKey(apiType, currentDate);
        dailyUsage.computeIfAbsent(dailyKey, k -> new AtomicInteger(0)).incrementAndGet();

        // Check if we should open circuit breaker
        checkCircuitBreakerThreshold(apiType);

        logger.debug("Recorded {} API call. Monthly: {}, Daily: {}", 
                    apiType, getMonthlyUsage(apiType, currentMonth), getDailyUsage(apiType, currentDate));
    }

    private boolean isOverDailyLimit(ApiType apiType) {
        LocalDate currentDate = LocalDate.now();
        int currentUsage = getDailyUsage(apiType, currentDate);
        int limit = getDailyLimit(apiType);
        return currentUsage >= limit;
    }

    private boolean isOverMonthlyLimit(ApiType apiType) {
        YearMonth currentMonth = YearMonth.now();
        int currentUsage = getMonthlyUsage(apiType, currentMonth);
        int limit = getMonthlyLimit(apiType);
        return currentUsage >= limit;
    }

    private boolean isCircuitBreakerOpen(ApiType apiType) {
        String key = apiType.name();
        CircuitBreakerState state = circuitBreakers.get(key);
        
        if (state == null) {
            return false;
        }
        
        // Check if circuit breaker should be reset
        if (System.currentTimeMillis() - state.openedAt > CIRCUIT_BREAKER_RESET_MINUTES * 60 * 1000) {
            circuitBreakers.remove(key);
            logger.info("Circuit breaker automatically reset for {}", apiType);
            return false;
        }
        
        return true;
    }

    private void checkCircuitBreakerThreshold(ApiType apiType) {
        YearMonth currentMonth = YearMonth.now();
        LocalDate currentDate = LocalDate.now();
        
        int monthlyUsage = getMonthlyUsage(apiType, currentMonth);
        int monthlyLimit = getMonthlyLimit(apiType);
        
        int dailyUsage = getDailyUsage(apiType, currentDate);
        int dailyLimit = getDailyLimit(apiType);
        
        // Check if we've crossed the circuit breaker threshold
        if (monthlyUsage >= monthlyLimit * CIRCUIT_BREAKER_THRESHOLD || 
            dailyUsage >= dailyLimit * CIRCUIT_BREAKER_THRESHOLD) {
            
            String key = apiType.name();
            circuitBreakers.put(key, new CircuitBreakerState(System.currentTimeMillis()));
            
            logger.warn("Circuit breaker opened for {} - Monthly: {}/{}, Daily: {}/{}", 
                       apiType, monthlyUsage, monthlyLimit, dailyUsage, dailyLimit);
        }
    }

    private int getMonthlyUsage(ApiType apiType, YearMonth month) {
        String key = getMonthlyKey(apiType, month);
        return monthlyUsage.getOrDefault(key, new AtomicInteger(0)).get();
    }

    private int getDailyUsage(ApiType apiType, LocalDate date) {
        String key = getDailyKey(apiType, date);
        return dailyUsage.getOrDefault(key, new AtomicInteger(0)).get();
    }

    private String getMonthlyKey(ApiType apiType, YearMonth month) {
        return apiType.name() + "_" + month.toString();
    }

    private String getDailyKey(ApiType apiType, LocalDate date) {
        return apiType.name() + "_" + date.toString();
    }

    private int getMonthlyLimit(ApiType apiType) {
        return switch (apiType) {
            case NEARBY_SEARCH -> MONTHLY_NEARBY_SEARCH_LIMIT;
            case PLACE_DETAILS -> MONTHLY_PLACE_DETAILS_LIMIT;
            case AUTOCOMPLETE -> MONTHLY_AUTOCOMPLETE_LIMIT;
        };
    }

    private int getDailyLimit(ApiType apiType) {
        return switch (apiType) {
            case NEARBY_SEARCH -> DAILY_NEARBY_SEARCH_LIMIT;
            case PLACE_DETAILS -> DAILY_PLACE_DETAILS_LIMIT;
            case AUTOCOMPLETE -> DAILY_AUTOCOMPLETE_LIMIT;
        };
    }

    private String getCircuitBreakerStatus() {
        StringBuilder status = new StringBuilder();
        for (String key : circuitBreakers.keySet()) {
            if (status.length() > 0) status.append(", ");
            status.append(key).append(" (open)");
        }
        return status.length() > 0 ? status.toString() : "all closed";
    }

    // Enums and Records
    public enum ApiType {
        NEARBY_SEARCH,
        PLACE_DETAILS,
        AUTOCOMPLETE
    }

    public enum QuotaHealthLevel {
        HEALTHY,
        MODERATE,
        WARNING,
        CRITICAL
    }

    private record CircuitBreakerState(long openedAt) {}

    public record QuotaUsageStats(
        int nearbySearchMonthlyUsage,
        int nearbySearchMonthlyLimit,
        int nearbySearchDailyUsage,
        int nearbySearchDailyLimit,
        int placeDetailsMonthlyUsage,
        int placeDetailsMonthlyLimit,
        int placeDetailsDailyUsage,
        int placeDetailsDailyLimit,
        int autocompleteMonthlyUsage,
        int autocompleteMonthlyLimit,
        int autocompleteDailyUsage,
        int autocompleteDailyLimit,
        long totalNearbySearchCalls,
        long totalPlaceDetailsCalls,
        long totalAutocompleteCalls,
        long totalRejectedCalls,
        String circuitBreakerStatus
    ) {}

    public record QuotaHealthStatus(
        QuotaHealthLevel healthLevel,
        double maxUsagePercent,
        double nearbySearchMonthlyPercent,
        double placeDetailsMonthlyPercent,
        double autocompleteMonthlyPercent,
        boolean hasRejectedCalls
    ) {}
} 