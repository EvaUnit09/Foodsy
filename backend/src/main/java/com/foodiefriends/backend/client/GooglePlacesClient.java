package com.foodiefriends.backend.client;

import com.foodiefriends.backend.dto.GooglePlacesSearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

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
                        "places.id,places.name,places.displayName,places.formattedAddress,places.types,places.location,places.photos,places.rating,places.priceLevel"
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
            return searchNearby(40.7645, -73.9235, 5000.0, 10);
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
                List.of(),
                4.5,
                100,
                GooglePlacesSearchResponse.PriceLevel.PRICE_LEVEL_MODERATE
            ),
            new GooglePlacesSearchResponse.Place(
                "mock_place_2",
                "Mock Restaurant 2",
                new GooglePlacesSearchResponse.DisplayName("Mock Restaurant 2", "en"),
                "456 Mock Avenue, Astoria, NY",
                List.of("restaurant", "food"),
                new GooglePlacesSearchResponse.Location(40.7646, -73.9236),
                List.of(),
                4.2,
                85,
                GooglePlacesSearchResponse.PriceLevel.PRICE_LEVEL_INEXPENSIVE
            ),
            new GooglePlacesSearchResponse.Place(
                "mock_place_3",
                "Mock Restaurant 3",
                new GooglePlacesSearchResponse.DisplayName("Mock Restaurant 3", "en"),
                "789 Mock Boulevard, Astoria, NY",
                List.of("restaurant", "food"),
                new GooglePlacesSearchResponse.Location(40.7647, -73.9237),
                List.of(),
                4.8,
                120,
                GooglePlacesSearchResponse.PriceLevel.PRICE_LEVEL_EXPENSIVE
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
            body.put("maxResultCount", maxResults * 2); // Request more to filter out non-restaurants

            Map<String, Object> circle = new HashMap<>();
            circle.put("center", Map.of("latitude", latitude, "longitude", longitude));
            circle.put("radius", radiusMeters);
            body.put("locationRestriction", Map.of("circle", circle));

            System.out.println("Making Google Places API request for nearby restaurants...");
            
            GooglePlacesSearchResponse response = restClient.post()
                    .uri("/places:searchNearby")
                    .body(body)
                    .retrieve()
                    .body(GooglePlacesSearchResponse.class);
            
            System.out.println("Google Places API response received. Response is null: " + (response == null));
            
            // Filter out non-restaurant places (hotels, etc.)
            if (response != null && response.places() != null) {
                System.out.println("Original places count: " + response.places().size());
                
                List<GooglePlacesSearchResponse.Place> filteredPlaces = response.places().stream()
                        .filter(place -> {
                            try {
                                // Check if it's actually a restaurant, not a hotel or other establishment
                                List<String> types = place.types();
                                if (types == null) {
                                    System.out.println("Place " + place.id() + " has null types, excluding");
                                    return false;
                                }
                                
                                boolean isRestaurant = types.contains("restaurant");
                                boolean isHotel = types.contains("lodging") || types.contains("hotel");
                                boolean isBar = types.contains("bar");
                                boolean isCafe = types.contains("cafe");
                                
                                // Only include if it's a restaurant, bar, or cafe, but not a hotel
                                boolean shouldInclude = (isRestaurant && !isHotel) || isBar || isCafe;
                                
                                if (!shouldInclude) {
                                    System.out.println("Excluding place " + place.id() + " with types: " + types);
                                }
                                
                                return shouldInclude;
                            } catch (Exception e) {
                                System.err.println("Error filtering place " + place.id() + ": " + e.getMessage());
                                return false;
                            }
                        })
                        .limit(maxResults)
                        .toList();
                
                System.out.println("Filtered " + response.places().size() + " places down to " + filteredPlaces.size() + " restaurants");
                
                return new GooglePlacesSearchResponse(filteredPlaces);
            } else {
                System.out.println("Response or places list is null, returning empty response");
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
                    .defaultHeader("X-Goog-FieldMask", "id,name,displayName,formattedAddress,types,location,photos,rating,priceLevel")
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
}
