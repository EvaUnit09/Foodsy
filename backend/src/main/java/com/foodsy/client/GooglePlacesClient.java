package com.foodsy.client;

import com.foodsy.dto.GooglePlacesSearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import org.springframework.web.util.UriComponentsBuilder;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GooglePlacesClient {
    private final RestClient restClient;
    private final String apiKey;

    public GooglePlacesClient(@Value("${google.places.api.key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl("https://places.googleapis.com/v1")
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .defaultHeader("X-Goog-FieldMask",
                        "places.id,places.name,places.displayName,places.formattedAddress,places.types,places.location,places.photos,places.rating,places.priceLevel,places.websiteUri"
                )
                .build();
    }

    public GooglePlacesSearchResponse search(String near, String query) {
        // For Google Places API, we need to first geocode the location
        // For now, using a default location (Astoria, NY) as in the original code
        // In a production app, you'd want to geocode the "near" parameter
        
        // Check if we have a valid API key (not the mock key)
        if ("mock-api-key-for-testing".equals(apiKey)) {
            // Return mock data for testing
            return createMockResponse();
        }
        
        try {
            GooglePlacesSearchResponse response = searchNearby(40.7645, -73.9235, 5000.0, 10);
            // For each place, fetch details and merge
            List<GooglePlacesSearchResponse.Place> enrichedPlaces = response.places().stream().map(place -> {
                try {
                    Map<String, Object> details = fetchPlaceDetails(place.id());
                    return mergePlaceWithDetails(place, details);
                } catch (Exception e) {
                    System.err.println("Error fetching details for place " + place.id() + ": " + e.getMessage());
                    return place;
                }
            }).toList();
            return new GooglePlacesSearchResponse(enrichedPlaces);
        } catch (Exception e) {
            System.err.println("Error calling Google Places API: " + e.getMessage());
            // Return mock data as fallback
            return createMockResponse();
        }
    }

    private GooglePlacesSearchResponse createMockResponse() {
        List<GooglePlacesSearchResponse.Place> mockPlaces = List.of(
            new GooglePlacesSearchResponse.Place(
                "mock_place_1",
                "Mock Restaurant 1",
                new GooglePlacesSearchResponse.DisplayName("Mock Restaurant 1", "en"),
                "123 Mock Street, Astoria, NY",
                List.of("restaurant", "food"),
                new GooglePlacesSearchResponse.Location(40.7645, -73.9235),
                List.of(
                    new GooglePlacesSearchResponse.Photo("mock_photo_1_1", 800, 600),
                    new GooglePlacesSearchResponse.Photo("mock_photo_1_2", 800, 600)
                ),
                4.5,
                100,
                GooglePlacesSearchResponse.PriceLevel.PRICE_LEVEL_MODERATE,
                "$-$$",
                "Mon-Sun: 9am-9pm",
                "A great place for mock food.",
                "Loved by locals for its mock cuisine.",
                "https://www.mockrestaurant1.com"
            ),
            new GooglePlacesSearchResponse.Place(
                "mock_place_2",
                "Mock Restaurant 2",
                new GooglePlacesSearchResponse.DisplayName("Mock Restaurant 2", "en"),
                "456 Mock Avenue, Astoria, NY",
                List.of("restaurant", "food"),
                new GooglePlacesSearchResponse.Location(40.7646, -73.9236),
                List.of(
                    new GooglePlacesSearchResponse.Photo("mock_photo_2_1", 800, 600),
                    new GooglePlacesSearchResponse.Photo("mock_photo_2_2", 800, 600)
                ),
                4.2,
                85,
                GooglePlacesSearchResponse.PriceLevel.PRICE_LEVEL_INEXPENSIVE,
                "$",
                "Mon-Fri: 10am-8pm",
                "Affordable and tasty mock meals.",
                "Great value for the price.",
                "https://www.mockrestaurant2.com"
            ),
            new GooglePlacesSearchResponse.Place(
                "mock_place_3",
                "Mock Restaurant 3",
                new GooglePlacesSearchResponse.DisplayName("Mock Restaurant 3", "en"),
                "789 Mock Boulevard, Astoria, NY",
                List.of("restaurant", "food"),
                new GooglePlacesSearchResponse.Location(40.7647, -73.9237),
                List.of(
                    new GooglePlacesSearchResponse.Photo("mock_photo_3_1", 800, 600),
                    new GooglePlacesSearchResponse.Photo("mock_photo_3_2", 800, 600)
                ),
                4.8,
                120,
                GooglePlacesSearchResponse.PriceLevel.PRICE_LEVEL_EXPENSIVE,
                "$$$",
                "Sat-Sun: 11am-11pm",
                "Fine dining mock experience.",
                "Top-rated by mock foodies.",
                "https://www.mockrestaurant3.com"
            )
        );
        
        return new GooglePlacesSearchResponse(mockPlaces);
    }

    public GooglePlacesSearchResponse searchNearby(
            double latitude,
            double longitude,
            double radiusMeters,
            int maxResults
    ) {
        try {
            Map<String, Object> body = new HashMap<>();
            body.put("includedTypes", List.of("restaurant"));
            // Google Places API requires 1..20 inclusive
            int capped = Math.max(1, Math.min(20, maxResults));
            body.put("maxResultCount", capped);

            Map<String, Object> circle = new HashMap<>();
            circle.put("center", Map.of("latitude", latitude, "longitude", longitude));
            circle.put("radius", radiusMeters);
            body.put("locationRestriction", Map.of("circle", circle));

            
            GooglePlacesSearchResponse response = restClient.post()
                    .uri("/places:searchNearby")
                    .body(body)
                    .retrieve()
                    .body(GooglePlacesSearchResponse.class);
            
            
            // Filter out non-restaurant places (hotels, etc.)
            if (response != null && response.places() != null) {
                
                List<GooglePlacesSearchResponse.Place> filteredPlaces = response.places().stream()
                        .filter(place -> {
                            try {
                                // Check if it's actually a restaurant, not a hotel or other establishment
                                List<String> types = place.types();
                                if (types == null) {
                                    return false;
                                }
                                
                                boolean isRestaurant = types.contains("restaurant");
                                boolean isHotel = types.contains("lodging") || types.contains("hotel");
                                boolean isBar = types.contains("bar");
                                boolean isCafe = types.contains("cafe");
                                
                                // Only include if it's a restaurant, bar, or cafe, but not a hotel
                                boolean shouldInclude = (isRestaurant && !isHotel) || isBar || isCafe;
                                
                                
                                return shouldInclude;
                            } catch (Exception e) {
                                System.err.println("Error filtering place " + place.id() + ": " + e.getMessage());
                                return false;
                            }
                        })
                        .limit(maxResults)
                        .toList();
                
                
                return new GooglePlacesSearchResponse(filteredPlaces);
            } else {
                return new GooglePlacesSearchResponse(List.of());
            }
        } catch (Exception e) {
            System.err.println("Error in searchNearby: " + e.getMessage());
            e.printStackTrace();
            // Return empty response instead of throwing
            return new GooglePlacesSearchResponse(List.of());
        }
    }

    public List<String> fetchPhotoUrls(String placeId, int limit) {
        try {
            // Create a separate RestClient for place details with correct field mask
            RestClient placeDetailsClient = RestClient.builder()
                    .baseUrl("https://places.googleapis.com/v1")
                    .defaultHeader("X-Goog-Api-Key", apiKey)
                    .defaultHeader("X-Goog-FieldMask", "id,name,displayName,formattedAddress,types,location,photos,rating,priceLevel,websiteUri")
                    .build();
            
            // Get place details to access photos
            @SuppressWarnings("unchecked")
            Map<String, Object> response = placeDetailsClient.get()
                    .uri("/places/{placeId}", placeId)
                    .retrieve()
                    .body(Map.class);

            if (response == null || !response.containsKey("photos")) {
                return List.of();
            }

            @SuppressWarnings("unchecked")
            List<Map<String, Object>> photos = (List<Map<String, Object>>) response.get("photos");
            return photos.stream()
                    .limit(limit)
                    .map(photo -> {
                        String photoName = (String) photo.get("name");
                        // Extract photo ID from the full photo name
                        // photoName format: "places/{placeId}/photos/{photoId}"
                        String[] parts = photoName.split("/");
                        if (parts.length >= 4) {
                            return parts[3]; // Return just the photo ID
                        }
                        return null;
                    })
                    .filter(id -> id != null)
                    .toList();
        } catch (Exception e) {
            System.err.println("Error fetching photos for place " + placeId + ": " + e.getMessage());
            return List.of();
        }
    }

    public String getApiKey() {
        return this.apiKey;
    }

    private Map<String, Object> fetchPlaceDetails(String placeId) {
        RestClient detailsClient = RestClient.builder()
                .baseUrl("https://places.googleapis.com/v1")
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .defaultHeader("X-Goog-FieldMask",
                        "id,displayName,formattedAddress,types,location,photos,rating,userRatingCount,priceLevel,priceRange,currentOpeningHours,generativeSummary,reviewSummary,websiteUri")
                .build();
        return detailsClient.get()
                .uri("/places/{placeId}", placeId)
                .retrieve()
                .body(Map.class);
    }

    private GooglePlacesSearchResponse.Place mergePlaceWithDetails(GooglePlacesSearchResponse.Place place, Map<String, Object> details) {
        // Helper to extract string or null
        java.util.function.Function<String, String> getString = key -> details.get(key) != null ? details.get(key).toString() : null;
        Double rating = details.get("rating") instanceof Number ? ((Number) details.get("rating")).doubleValue() : place.rating();
        Integer userRatingCount = details.get("userRatingCount") instanceof Number ? ((Number) details.get("userRatingCount")).intValue() : place.userRatingsTotal();
        String priceLevel = getString.apply("priceLevel");
        String priceRange = getString.apply("priceRange");
        String currentOpeningHours = details.get("currentOpeningHours") != null ? details.get("currentOpeningHours").toString() : null;
        String generativeSummary = getString.apply("generativeSummary");
        String reviewSummary = getString.apply("reviewSummary");
        String websiteUri = getString.apply("websiteUri");
        return new GooglePlacesSearchResponse.Place(
                place.id(),
                place.name(),
                place.displayName(),
                place.formattedAddress(),
                place.types(),
                place.location(),
                place.photos(),
                rating,
                userRatingCount,
                place.priceLevel(),
                priceRange,
                currentOpeningHours,
                generativeSummary,
                reviewSummary,
                websiteUri != null ? websiteUri : place.websiteUri()
        );
    }
}
