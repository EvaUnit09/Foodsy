package com.foodiefriends.backend.controller;

import com.foodiefriends.backend.dto.HomepageAnalyticsDto;
import com.foodiefriends.backend.dto.HomepageResponseDto;
import com.foodiefriends.backend.dto.TasteProfileDto;
import com.foodiefriends.backend.service.HomepageAnalyticsService;
import com.foodiefriends.backend.service.HomepageService;
import com.foodiefriends.backend.service.TasteProfileService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/api/homepage")
// CORS is configured globally in SecurityConfig/WebConfig; no need for per-controller override.
public class HomepageController {

    private static final Logger logger = LoggerFactory.getLogger(HomepageController.class);

    @Autowired
    private HomepageService homepageService;

    @Autowired
    private TasteProfileService tasteProfileService;

    @Autowired
    private HomepageAnalyticsService analyticsService;

    /**
     * Get aggregated homepage data
     * GET /api/homepage
     */
    @GetMapping
    public ResponseEntity<HomepageResponseDto> getHomepage(Authentication authentication) {
        System.out.println("DEBUG: Homepage endpoint called, authentication: " + authentication);
        try {
            if (authentication != null && authentication.isAuthenticated()) {
                // Authenticated user
                Long userId = extractUserId(authentication);
                String userName = authentication.getName();
                
                HomepageResponseDto homepage = homepageService.getHomepageForUser(userId, userName);
                return ResponseEntity.ok(homepage);
            } else {
                // Anonymous user
                HomepageResponseDto homepage = homepageService.getHomepageForAnonymous();
                return ResponseEntity.ok(homepage);
            }
        } catch (Exception e) {
            logger.error("Error getting homepage data: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(getErrorHomepage());
        }
    }

    /**
     * Get user's taste profile
     * GET /api/homepage/taste-profile
     */
    @GetMapping("/taste-profile")
    public ResponseEntity<TasteProfileDto> getTasteProfile(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Long userId = extractUserId(authentication);
            Optional<TasteProfileDto> tasteProfile = tasteProfileService.getUserTasteProfile(userId);
            
            return tasteProfile
                .map(profile -> ResponseEntity.ok(profile))
                .orElse(ResponseEntity.notFound().build());
                
        } catch (Exception e) {
            logger.error("Error getting taste profile: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Save or update user's taste profile
     * POST /api/homepage/taste-profile
     */
    @PostMapping("/taste-profile")
    public ResponseEntity<TasteProfileDto> saveTasteProfile(
            @Valid @RequestBody TasteProfileDto tasteProfileDto,
            Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
            }

            Long userId = extractUserId(authentication);
            TasteProfileDto savedProfile = tasteProfileService.saveOrUpdateTasteProfile(userId, tasteProfileDto);
            
            // Track analytics event
            homepageService.trackEvent(userId, "taste_profile_complete", "onboarding", null);
            
            return ResponseEntity.ok(savedProfile);
            
        } catch (IllegalArgumentException e) {
            logger.warn("Invalid taste profile data: {}", e.getMessage());
            return ResponseEntity.badRequest().build();
        } catch (Exception e) {
            logger.error("Error saving taste profile: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Check if user has completed taste profile onboarding
     * GET /api/homepage/taste-profile/completed
     */
    @GetMapping("/taste-profile/completed")
    public ResponseEntity<Map<String, Boolean>> hasCompletedOnboarding(Authentication authentication) {
        try {
            if (authentication == null || !authentication.isAuthenticated()) {
                return ResponseEntity.ok(Map.of("completed", false));
            }

            Long userId = extractUserId(authentication);
            boolean completed = tasteProfileService.hasCompletedOnboarding(userId);
            
            return ResponseEntity.ok(Map.of("completed", completed));
            
        } catch (Exception e) {
            logger.error("Error checking onboarding status: {}", e.getMessage());
            return ResponseEntity.ok(Map.of("completed", false));
        }
    }

    /**
     * Get available options for taste profile onboarding
     * GET /api/homepage/taste-profile/options
     */
    @GetMapping("/taste-profile/options")
    public ResponseEntity<Map<String, Object>> getTasteProfileOptions() {
        try {
            Map<String, Object> options = Map.of(
                "cuisines", TasteProfileService.AVAILABLE_CUISINES,
                "priceRanges", TasteProfileService.AVAILABLE_PRICE_RANGES,
                "boroughs", TasteProfileService.AVAILABLE_BOROUGHS
            );
            
            return ResponseEntity.ok(options);
            
        } catch (Exception e) {
            logger.error("Error getting taste profile options: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Track homepage analytics event
     * POST /api/homepage/analytics
     */
    @PostMapping("/analytics")
    public ResponseEntity<Void> trackEvent(
            @Valid @RequestBody HomepageAnalyticsDto eventDto,
            Authentication authentication,
            HttpServletRequest request) {
        try {
            if (authentication != null && authentication.isAuthenticated()) {
                // Authenticated user
                Long userId = extractUserId(authentication);
                analyticsService.trackEvent(userId, eventDto);
            } else {
                // Anonymous user - use session ID
                String sessionId = request.getSession().getId();
                analyticsService.trackAnonymousEvent(sessionId, eventDto);
            }
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            logger.error("Error tracking analytics event: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Track restaurant card click (convenience endpoint)
     * POST /api/homepage/analytics/card-click
     */
    @PostMapping("/analytics/card-click")
    public ResponseEntity<Void> trackCardClick(
            @RequestParam String section,
            @RequestParam String placeId,
            Authentication authentication,
            HttpServletRequest request) {
        try {
            if (authentication != null && authentication.isAuthenticated()) {
                Long userId = extractUserId(authentication);
                analyticsService.trackRestaurantCardClick(userId, section, placeId);
            } else {
                String sessionId = request.getSession().getId();
                analyticsService.trackAnonymousRestaurantCardClick(sessionId, section, placeId);
            }
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            logger.error("Error tracking card click: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Track session start from homepage
     * POST /api/homepage/analytics/session-start
     */
    @PostMapping("/analytics/session-start")
    public ResponseEntity<Void> trackSessionStart(Authentication authentication) {
        try {
            if (authentication != null && authentication.isAuthenticated()) {
                Long userId = extractUserId(authentication);
                analyticsService.trackSessionStart(userId);
            }
            
            return ResponseEntity.ok().build();
            
        } catch (Exception e) {
            logger.error("Error tracking session start: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get homepage statistics (admin endpoint)
     * GET /api/homepage/stats
     */
    @GetMapping("/stats")
    public ResponseEntity<HomepageService.HomepageStats> getHomepageStats(Authentication authentication) {
        try {
            // This could be restricted to admin users in production
            HomepageService.HomepageStats stats = homepageService.getHomepageStats();
            return ResponseEntity.ok(stats);
            
        } catch (Exception e) {
            logger.error("Error getting homepage stats: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get analytics summary
     * GET /api/homepage/analytics/summary
     */
    @GetMapping("/analytics/summary")
    public ResponseEntity<HomepageAnalyticsService.AnalyticsSummary> getAnalyticsSummary(
            @RequestParam(defaultValue = "7") int days,
            Authentication authentication) {
        try {
            // This could be restricted to admin users in production
            HomepageAnalyticsService.AnalyticsSummary summary = analyticsService.getAnalyticsSummary(days);
            return ResponseEntity.ok(summary);
            
        } catch (Exception e) {
            logger.error("Error getting analytics summary: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Get conversion funnel metrics
     * GET /api/homepage/analytics/funnel
     */
    @GetMapping("/analytics/funnel")
    public ResponseEntity<HomepageAnalyticsService.ConversionFunnel> getConversionFunnel(
            @RequestParam(defaultValue = "7") int days,
            Authentication authentication) {
        try {
            HomepageAnalyticsService.ConversionFunnel funnel = analyticsService.getConversionFunnel(days);
            return ResponseEntity.ok(funnel);
            
        } catch (Exception e) {
            logger.error("Error getting conversion funnel: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Refresh borough data (admin endpoint)
     * POST /api/homepage/refresh/{borough}
     */
    @PostMapping("/refresh/{borough}")
    public ResponseEntity<HomepageService.RefreshResult> refreshBoroughData(
            @PathVariable String borough,
            Authentication authentication) {
        try {
            // This should be restricted to admin users in production
            if (!TasteProfileService.AVAILABLE_BOROUGHS.contains(borough)) {
                return ResponseEntity.badRequest().build();
            }
            
            HomepageService.RefreshResult result = homepageService.refreshBoroughData(borough);
            
            if (result.success()) {
                return ResponseEntity.ok(result);
            } else {
                return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
            }
            
        } catch (Exception e) {
            logger.error("Error refreshing borough data: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Test endpoint to verify security config
     * GET /api/homepage/test
     */
    @GetMapping("/test")
    public ResponseEntity<String> testEndpoint() {
        return ResponseEntity.ok("Homepage test endpoint works!");
    }

    /**
     * Health check endpoint
     * GET /api/homepage/health
     */
    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            HomepageService.HomepageStats stats = homepageService.getHomepageStats();
            
            Map<String, Object> health = Map.of(
                "status", "healthy",
                "totalRestaurants", stats.totalCachedRestaurants(),
                "timestamp", System.currentTimeMillis()
            );
            
            return ResponseEntity.ok(health);
            
        } catch (Exception e) {
            logger.error("Health check failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("status", "unhealthy", "error", e.getMessage()));
        }
    }

    // Helper methods
    private Long extractUserId(Authentication authentication) {
        // This assumes the authentication contains user ID
        // Adjust based on your authentication setup
        try {
            return Long.parseLong(authentication.getName());
        } catch (NumberFormatException e) {
            // If name is not a number, you might need to look up the user
            logger.warn("Could not extract user ID from authentication: {}", authentication.getName());
            return 1L; // Default fallback - adjust as needed
        }
    }

    private HomepageResponseDto getErrorHomepage() {
        return HomepageResponseDto.builder()
            .authenticated(false, null)
            .tasteProfile(null)
            .yourPicks(List.of())
            .neighborhoodHighlights(List.of())
            .trendingNow(List.of())
            .spotlight(List.of())
            .metadata("Manhattan", 0, true)
            .performance(0, false, "error")
            .build();
    }
} 