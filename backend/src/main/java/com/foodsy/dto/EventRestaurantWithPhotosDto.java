package com.foodsy.dto;

import com.foodsy.domain.EventSessionRestaurant;
import com.foodsy.domain.RestaurantCache;

import java.util.List;
import java.util.stream.Collectors;

public record EventRestaurantWithPhotosDto(
        Long id,
        Long sessionId,
        String providerId,
        String name,
        String address,
        String category,
        String priceLevel,
        Double rating,
        int displayOrder,
        List<String> photos
) {
    public static EventRestaurantWithPhotosDto from(EventSessionRestaurant r, RestaurantCache cache) {
        return new EventRestaurantWithPhotosDto(
                r.getId(),
                r.getSessionId(),
                r.getProviderId(),
                r.getName(),
                r.getAddress(),
                r.getCategory(),
                r.getPriceLevel(),
                r.getRating(),
                r.getDisplayOrder() != null ? r.getDisplayOrder() : 0,
                buildPhotoUrls(cache)
        );
    }

    private static List<String> buildPhotoUrls(RestaurantCache cache) {
        if (cache == null) return List.of();
        List<String> photoUrls = cache.getPhotoUrls();
        if (photoUrls != null && !photoUrls.isEmpty()) return photoUrls;
        List<String> refs = cache.getPhotoReferences();
        if (refs == null || refs.isEmpty()) return List.of();
        String placeId = cache.getPlaceId();
        return refs.stream()
                .map(ref -> {
                    String photoId = ref;
                    if (ref.startsWith("places/") && ref.contains("/photos/")) {
                        String[] parts = ref.split("/photos/");
                        if (parts.length > 1) photoId = parts[1];
                    }
                    return "/api/restaurants/photos/" + placeId + "/" + photoId + "?maxWidthPx=600&maxHeightPx=600";
                })
                .collect(Collectors.toList());
    }
}
