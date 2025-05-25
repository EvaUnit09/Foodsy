package com.foodiefriends.backend.client;
import com.foodiefriends.backend.dto.FoursquareSearchResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;
import com.foodiefriends.backend.dto.FourSquarePhotoResponse;

import java.util.Arrays;
import java.util.List;

@Component
public class FoursquareClient {
    private final RestClient restClient;

    public FoursquareClient(@Value("${foursquare.api.key}") String apiKey) {
        this.restClient = RestClient.builder()
                .baseUrl("https://api.foursquare.com/v3/places")
                .defaultHeader("Authorization", apiKey)
                .build();
    }
    public FoursquareSearchResponse search(String near, String query) {
        return restClient.get()
                .uri(uriBuilder -> uriBuilder
                        .path("/search")
                        .queryParam("near", near)
                        .queryParam("query", query)
                        .queryParam("limit", 10)
                        .build())
                .retrieve()
                .body(FoursquareSearchResponse.class); // mapping later
    }
    public List<String> fetchPhotoUrls(String fsqId, int limit) {
        FourSquarePhotoResponse[] photos = restClient
                .get()
                .uri("/{id}/photos?limit={lim}", fsqId, limit)
                .retrieve()
                .body(FourSquarePhotoResponse[].class);
        if (photos == null) return List.of();

        return Arrays.stream(photos)
                .map(p -> p.prefix() + "original" + p.suffix())
                .toList();
    }
}
