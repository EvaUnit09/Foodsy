package com.foodsy.controller;

import java.util.List;
import java.util.regex.Pattern;
import com.foodsy.client.GooglePlacesClient;
import com.foodsy.domain.Session;
import com.foodsy.dto.RestaurantDto;
import com.foodsy.dto.RestaurantSummaryDto;
import com.foodsy.service.RestaurantCacheService;
import com.foodsy.service.S3PhotoUploadJob;
import com.foodsy.service.SessionService;
import com.foodsy.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/restaurants")
public class RestaurantController {
    private static final Logger logger = LoggerFactory.getLogger(RestaurantController.class);

    // Allowlist patterns for path variables forwarded to Google Places API (#7)
    private static final Pattern PLACE_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_\\-]{10,250}$");
    private static final Pattern PHOTO_ID_PATTERN = Pattern.compile("^[A-Za-z0-9_\\-./]{10,500}$");

    private final GooglePlacesClient placesClient;
    private final SessionService sessionService;
    private final RestaurantCacheService restaurantCacheService;
    private final UserService userService;
    private final S3PhotoUploadJob s3PhotoUploadJob;
    private final com.foodsy.repository.RestaurantCacheRepository cacheRepository;
    private final com.foodsy.service.PlacesApiCallTracker tracker;

    @Value("${admin.secret:}")
    private String adminSecret;

    public RestaurantController(GooglePlacesClient placesClient, SessionService sessionService,
                                RestaurantCacheService restaurantCacheService,
                                UserService userService,
                                S3PhotoUploadJob s3PhotoUploadJob,
                                com.foodsy.repository.RestaurantCacheRepository cacheRepository,
                                com.foodsy.service.PlacesApiCallTracker tracker) {
        this.placesClient = placesClient;
        this.sessionService = sessionService;
        this.restaurantCacheService = restaurantCacheService;
        this.userService = userService;
        this.s3PhotoUploadJob = s3PhotoUploadJob;
        this.cacheRepository = cacheRepository;
        this.tracker = tracker;
    }
    private static final java.util.Set<String> SUPPORTED_BOROUGHS =
            java.util.Set.of("manhattan", "queens", "brooklyn", "bronx", "staten island");

    private static final java.util.List<String> TRENDING_BOROUGHS =
            java.util.List.of("Manhattan", "Queens", "Brooklyn");

    @PostMapping("/trending/refresh")
    public ResponseEntity<java.util.Map<String, Object>> refreshTrending(HttpServletRequest request) {
        // Require admin secret header to prevent unauthorized quota exhaustion (#3)
        String providedSecret = request.getHeader("X-Admin-Secret");
        if (adminSecret == null || adminSecret.isBlank() ||
                !adminSecret.equals(providedSecret)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        java.util.List<String> refreshed = new java.util.ArrayList<>();
        java.util.List<String> failed = new java.util.ArrayList<>();
        for (String borough : TRENDING_BOROUGHS) {
            try {
                restaurantCacheService.fetchAndCacheTrendingForBorough(borough);
                refreshed.add(borough);
            } catch (Exception e) {
                failed.add(borough + ": " + e.getMessage());
            }
        }
        return ResponseEntity.ok(java.util.Map.of("refreshed", refreshed, "failed", failed));
    }

    @PostMapping("/photos/sync")
    public ResponseEntity<java.util.Map<String, Object>> syncPhotos(
            HttpServletRequest request,
            @org.springframework.web.bind.annotation.RequestParam(defaultValue = "false") boolean force) {
        String providedSecret = request.getHeader("X-Admin-Secret");
        if (adminSecret == null || adminSecret.isBlank() ||
                !adminSecret.equals(providedSecret)) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).build();
        }
        if (force) {
            cacheRepository.clearAllPhotoUrls();
        }
        java.util.concurrent.CompletableFuture.runAsync(s3PhotoUploadJob::uploadPendingPhotos);
        return ResponseEntity.accepted().body(java.util.Map.of("status", "sync started", "force", force));
    }

    private static final java.util.List<String> DISCOVERY_BOROUGHS =
            java.util.List.of("manhattan", "brooklyn", "queens");

    @GetMapping("/discover")
    public ResponseEntity<List<RestaurantSummaryDto>> getDiscovery(
            @RequestParam(defaultValue = "manhattan") String borough,
            @RequestParam(defaultValue = "20") int limit,
            @RequestParam(required = false) String neighborhood,
            Authentication authentication) {
        if (limit < 1 || limit > 50) return ResponseEntity.badRequest().build();
        String normalized = borough.trim().toLowerCase();
        if (!DISCOVERY_BOROUGHS.contains(normalized)) {
            return ResponseEntity.badRequest().build();
        }
        String capitalized = Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
        String normalizedNeighborhood = (neighborhood != null && !neighborhood.isBlank())
                ? neighborhood.trim()
                : null;

        // Route authenticated users to their personalized daily feed
        boolean isRealUser = authentication != null
                && authentication.isAuthenticated()
                && !(authentication instanceof AnonymousAuthenticationToken);
        if (isRealUser) {
            return userService.findByAuthentication(authentication)
                    .map(user -> ResponseEntity.ok(
                            restaurantCacheService.getDailyUserFeed(user, capitalized, limit)))
                    .orElseGet(() -> ResponseEntity.ok(
                            restaurantCacheService.getDiscoveryRestaurants(capitalized, normalizedNeighborhood, limit)));
        }

        return ResponseEntity.ok(restaurantCacheService.getDiscoveryRestaurants(capitalized, normalizedNeighborhood, limit));
    }

    @GetMapping("/trending")
    public ResponseEntity<List<RestaurantSummaryDto>> getTrending(
            @RequestParam(defaultValue = "manhattan") String borough) {
        String normalized = borough.trim().toLowerCase();
        if (!SUPPORTED_BOROUGHS.contains(normalized)) {
            return ResponseEntity.badRequest().build();
        }
        String capitalized = Character.toUpperCase(normalized.charAt(0)) + normalized.substring(1);
        List<RestaurantSummaryDto> results = restaurantCacheService.getTrendingRestaurants(capitalized, 5);
        return ResponseEntity.ok(results);
    }

    @GetMapping("/search")
    public List<RestaurantDto> searchRestaurants(
            @RequestParam String q,
            @RequestParam(defaultValue = "5") int limit) {
        return placesClient.search("New York, NY", q + " restaurant").places().stream()
                .limit(limit)
                .map(place -> new RestaurantDto(
                        place.id(),
                        place.displayName().text(),
                        place.formattedAddress(),
                        place.types().isEmpty() ? "Restaurant" : place.types().getFirst(),
                        place.priceLevel() != null ? place.priceLevel().name() : null,
                        place.priceRange(),
                        place.rating(),
                        place.userRatingsTotal(),
                        place.currentOpeningHours(),
                        place.generativeSummary(),
                        place.reviewSummary(),
                        place.websiteUri()
                ))
                .toList();
    }

    @GetMapping
    public List<RestaurantDto> search(@RequestParam String near, @RequestParam String query) {
        return placesClient.search(near, query).places().stream()
                .map(place -> new RestaurantDto(
                        place.id(),
                        place.displayName().text(),
                        place.formattedAddress(),
                        place.types().isEmpty() ? "Restaurant" : place.types().getFirst(),
                        place.priceLevel() != null ? place.priceLevel().name() : null,
                        place.priceRange(),
                        place.rating(),
                        place.userRatingsTotal(),
                        place.currentOpeningHours(),
                        place.generativeSummary(),
                        place.reviewSummary(),
                        place.websiteUri()
                ))
                .toList();
    }
    @PostMapping
    public Session create(@RequestBody Session session) {
        return sessionService.createSession(session);
    }

    @GetMapping("/{providerId}/photos")
    public List<String> getPhotos(
            @PathVariable String providerId,
            @RequestParam(defaultValue = "5") int limit) {

        if (limit <= 0) {
            throw new IllegalArgumentException("limit must be positive");
        }

        return placesClient.fetchPhotoUrls(providerId, limit);
    }

    @GetMapping("/photos/{placeId}/{photoId}")
    public ResponseEntity<byte[]> proxyPhoto(
            @PathVariable String placeId,
            @PathVariable String photoId,
            @RequestParam(defaultValue = "800") int maxHeightPx,
            @RequestParam(defaultValue = "800") int maxWidthPx) {
        // Validate path variables before forwarding to upstream (#7)
        if (!PLACE_ID_PATTERN.matcher(placeId).matches() ||
                !PHOTO_ID_PATTERN.matcher(photoId).matches()) {
            return ResponseEntity.badRequest().build();
        }
        logger.info("PLACES_API type=photo_media placeId={} photoId={} caller=proxyPhoto", placeId, photoId);
        tracker.incrementProxyHits();
        tracker.incrementPhotoMediaCalls();
        try {
            // API key goes in header, not query string, to avoid leaking it in server logs (#2)
            String url = String.format(
                "https://places.googleapis.com/v1/places/%s/photos/%s/media?maxHeightPx=%d&maxWidthPx=%d",
                placeId, photoId, maxHeightPx, maxWidthPx
            );

            RestTemplate restTemplate = new RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            headers.set("X-Goog-Api-Key", placesClient.getApiKey());
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<byte[]> response = restTemplate.exchange(
                url,
                org.springframework.http.HttpMethod.GET,
                entity,
                byte[].class
            );
            MediaType contentType = response.getHeaders().getContentType();
            return ResponseEntity.status(response.getStatusCode())
                    .contentType(contentType != null ? contentType : MediaType.IMAGE_JPEG)
                    .header("Cache-Control", "public, max-age=2592000, immutable")
                    .body(response.getBody());
        } catch (RestClientResponseException e) {
            logger.error("Google Places API error: {} - {}", e.getRawStatusCode(), e.getResponseBodyAsString());
            
            // Return a simple placeholder image instead of null
            String placeholderSvg = """
                <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                    <rect width="400" height="400" fill="#f0f0f0"/>
                    <text x="200" y="200" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#666">
                        Photo not available
                    </text>
                </svg>
                """;
            
            return ResponseEntity.ok()
                    .contentType(MediaType.valueOf("image/svg+xml"))
                    .body(placeholderSvg.getBytes());
        } catch (Exception e) {
            logger.error("Error fetching photo: {}", e.getMessage(), e);
            
            // Return a simple placeholder image instead of error
            String placeholderSvg = """
                <svg width="400" height="400" xmlns="http://www.w3.org/2000/svg">
                    <rect width="400" height="400" fill="#f0f0f0"/>
                    <text x="200" y="200" text-anchor="middle" dy=".3em" font-family="Arial" font-size="16" fill="#666">
                        Photo not available
                    </text>
                </svg>
                """;
            
            return ResponseEntity.ok()
                    .contentType(MediaType.valueOf("image/svg+xml"))
                    .body(placeholderSvg.getBytes());
        }
    }
}
