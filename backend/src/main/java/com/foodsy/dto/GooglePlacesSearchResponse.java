package com.foodsy.dto;

import java.util.List;

public record GooglePlacesSearchResponse(
        List<Place> places
) {
    public record Place(
            String id,
            String name,
            DisplayName displayName,
            String formattedAddress,
            List<String> types,
            Location location,
            List<Photo> photos,
            Double rating,
            Integer userRatingsTotal,
            PriceLevel priceLevel,
            String priceRange,
            String currentOpeningHours,
            String generativeSummary,
            String reviewSummary
    ) {}

    public record DisplayName(
            String text,
            String languageCode
    ) {}

    public record Location(
            Double latitude,
            Double longitude
    ) {}

    public record Photo(
            String name,
            Integer widthPx,
            Integer heightPx
    ) {}

    public enum PriceLevel {
        PRICE_LEVEL_FREE,
        PRICE_LEVEL_INEXPENSIVE,
        PRICE_LEVEL_MODERATE,
        PRICE_LEVEL_EXPENSIVE,
        PRICE_LEVEL_VERY_EXPENSIVE
    }
}
