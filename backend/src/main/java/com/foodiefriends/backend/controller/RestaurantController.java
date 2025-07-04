package com.foodiefriends.backend.controller;

import java.util.List;
import com.foodiefriends.backend.client.GooglePlacesClient;
import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.dto.RestaurantDto;
import com.foodiefriends.backend.service.SessionService;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.client.RestTemplate;

@RestController
@RequestMapping("/api/restaurants")
public class RestaurantController {
    private final GooglePlacesClient placesClient;
    private final SessionService sessionService;

    public RestaurantController(GooglePlacesClient placesClient, SessionService sessionService) {
        this.placesClient = placesClient;
        this.sessionService = sessionService;
    }
    @GetMapping
    public List<RestaurantDto> search(@RequestParam String near, @RequestParam String query) {
        return placesClient.search(near, query).places().stream()
                .map(place -> new RestaurantDto(
                        place.id(),
                        place.displayName().text(),
                        place.formattedAddress(),
                        place.types().isEmpty() ? "Restaurant" : place.types().getFirst()
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
        try {
            // Build the Google Places photo URL
            String apiKey = placesClient.getApiKey();
            
            // Clean the API key to remove any potential encoding issues
            
            String url = String.format(
                "https://places.googleapis.com/v1/places/%s/photos/%s/media?key=%s&maxHeightPx=%d&maxWidthPx=%d",
                placeId, photoId, apiKey, maxHeightPx, maxWidthPx
            );
            
            System.out.println("Fetching photo from: " + url);

            RestTemplate restTemplate = new RestTemplate();
            org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
            // Google API may require the API key in header, but it's in the URL here
            org.springframework.http.HttpEntity<String> entity = new org.springframework.http.HttpEntity<>(headers);
            org.springframework.http.ResponseEntity<byte[]> response = restTemplate.exchange(
                url,
                org.springframework.http.HttpMethod.GET,
                entity,
                byte[].class
            );
            MediaType contentType = response.getHeaders().getContentType();
            System.out.println("Photo fetched successfully, content type: " + contentType);
            return ResponseEntity.status(response.getStatusCode())
                    .contentType(contentType != null ? contentType : MediaType.IMAGE_JPEG)
                    .body(response.getBody());
        } catch (RestClientResponseException e) {
            System.err.println("Google Places API error: " + e.getRawStatusCode() + " - " + e.getResponseBodyAsString());
            
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
            System.err.println("Error fetching photo: " + e.getMessage());
            e.printStackTrace();
            
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
