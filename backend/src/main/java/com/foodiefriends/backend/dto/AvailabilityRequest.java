package com.foodiefriends.backend.dto;

public record AvailabilityRequest(
        String email,
        String username
) {}