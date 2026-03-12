package com.foodsy.controller;

import com.foodsy.dto.HomepageResponseDto;
import com.foodsy.service.HomepageService;
import com.foodsy.service.UserService;
import com.foodsy.domain.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.util.Set;

@RestController
@RequestMapping("/homepage")
public class HomepageController {

    private static final Logger logger = LoggerFactory.getLogger(HomepageController.class);

    private static final Set<String> VALID_BOROUGHS =
        Set.of("Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island");

    @Autowired
    private HomepageService homepageService;

    @Autowired
    private UserService userService;

    @GetMapping
    public ResponseEntity<HomepageResponseDto> getHomepage(Authentication authentication) {
        try {
            if (authentication != null && authentication.isAuthenticated()) {
                Long userId = extractUserId(authentication);
                String userName = authentication.getName();
                return ResponseEntity.ok(homepageService.getHomepageForUser(userId, userName));
            } else {
                return ResponseEntity.ok(homepageService.getHomepageForAnonymous());
            }
        } catch (Exception e) {
            logger.error("Error getting homepage data: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @GetMapping("/stats")
    public ResponseEntity<HomepageService.HomepageStats> getHomepageStats() {
        try {
            return ResponseEntity.ok(homepageService.getHomepageStats());
        } catch (Exception e) {
            logger.error("Error getting homepage stats: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/refresh/{borough}")
    public ResponseEntity<HomepageService.RefreshResult> refreshBoroughData(@PathVariable String borough) {
        try {
            if (!VALID_BOROUGHS.contains(borough)) {
                return ResponseEntity.badRequest().build();
            }
            HomepageService.RefreshResult result = homepageService.refreshBoroughData(borough);
            return result.success()
                ? ResponseEntity.ok(result)
                : ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(result);
        } catch (Exception e) {
            logger.error("Error refreshing borough data: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    @PostMapping("/trending/update/{borough}")
    public ResponseEntity<Map<String, Object>> updateTrendingScores(@PathVariable String borough) {
        try {
            if (!VALID_BOROUGHS.contains(borough)) {
                return ResponseEntity.badRequest().body(Map.of("success", false, "error", "Invalid borough: " + borough));
            }
            homepageService.updateTrendingScoresForBorough(borough);
            return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Updated trending scores for " + borough,
                "borough", borough,
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            logger.error("Error updating trending scores for borough {}: {}", borough, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("success", false, "error", e.getMessage()));
        }
    }

    @GetMapping("/trending/stats/{borough}")
    public ResponseEntity<Map<String, Object>> getTrendingStats(@PathVariable String borough) {
        try {
            if (!VALID_BOROUGHS.contains(borough)) {
                return ResponseEntity.badRequest().body(Map.of("error", "Invalid borough: " + borough));
            }
            return ResponseEntity.ok(homepageService.getTrendingStatsForBorough(borough));
        } catch (Exception e) {
            logger.error("Error getting trending stats for borough {}: {}", borough, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/health")
    public ResponseEntity<Map<String, Object>> healthCheck() {
        try {
            HomepageService.HomepageStats stats = homepageService.getHomepageStats();
            return ResponseEntity.ok(Map.of(
                "status", "healthy",
                "totalRestaurants", stats.totalCachedRestaurants(),
                "timestamp", System.currentTimeMillis()
            ));
        } catch (Exception e) {
            logger.error("Health check failed: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE)
                .body(Map.of("status", "unhealthy", "error", e.getMessage()));
        }
    }

    private Long extractUserId(Authentication authentication) {
        if (authentication == null) {
            throw new IllegalStateException("Authentication required but not provided");
        }

        String username = authentication.getName();
        if (username == null || username.trim().isEmpty()) {
            throw new IllegalStateException("Username not found in authentication");
        }

        try {
            return Long.parseLong(username);
        } catch (NumberFormatException e) {
            Optional<User> user = userService.findByUsername(username);
            if (user.isPresent()) {
                return user.get().getId();
            } else {
                logger.error("User not found for authentication username: {}", username);
                throw new IllegalArgumentException("User not found: " + username);
            }
        }
    }
}
