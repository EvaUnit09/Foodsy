package com.foodiefriends.backend.dto;

public record RestaurantDto(
        String id,
        String name,
        String address,
        String category,
        String priceLevel,
        String priceRange,
        Double rating,
        Integer userRatingCount,
        String currentOpeningHours,
        String generativeSummary,
        String reviewSummary
) {}


