package com.foodiefriends.backend.dto;

import jdk.jfr.Category;

import java.util.List;

public record FoursquareSearchResponse(
        List<Place> results
) {
    public record Place(
            String fsq_id,
            String name,
            Location location,
            List<Category> categories
    ) {}

    public record Location(
            String address,
            String locality,
            String region
    ) {}
    public record Category(
            String name
    ) {}
}
