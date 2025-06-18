package com.foodiefriends.backend.client;

import com.foodiefriends.backend.dto.GooglePlacesSearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.Arrays;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Component
public class GooglePlacesClient {
    private final RestClient restClient;

    public GooglePlacesClient(@Value("${google.places.api.key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl("https://places.googleapis.com/v1")
                .defaultHeader("X-Goog-Api-Key", apiKey)
                .defaultHeader("X-Goog-FieldMask",
                        "places.name," +
                                "places.types," +
                                "places.displayName," +
                                "places.formattedAddress," +
                                "places.types," +
                                "places.id," +
                                "places.location," +
                                "places.photos," +
                                "places.rating," +
                                "places.openingHours," +
                                "places.userRatingsTotal," +
                                "places.generalRating," +
                                "places.reviews," +
                                "places.openingHours.openNow" +
                                "places.paymentOptions," +
                                "places.servesBrunch," +
                                "places.priceLevel," +
                                "places.priceRange," +
                                "places.websiteUri," +
                                "places.icon"
                )
                .build();
    }
    public GooglePlacesSearchResponse searchNearby(
            double latitude,
            double longitude,
            double radiusMeters,
            int maxResults
    ) {
        Map<String, Object> body = new HashMap<>();
        body.put("includedTypes", List.of("restaurants"));
        body.put("maxResultCount", maxResults);

        Map<String, Object> circle = new HashMap<>();
        circle.put("center", Map.of("latitude", latitude, "longitude", longitude));
        circle.put("radius", radiusMeters);
        body.put("locationRestriction", Map.of("circle", circle));

        return restClient.post()
                .uri("/places:searchNearby")
                .body(body)
                .retrieve()
                .body(GooglePlacesSearchResponse.class);

    }

}
