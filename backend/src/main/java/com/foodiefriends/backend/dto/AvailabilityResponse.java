package com.foodiefriends.backend.dto;

public record AvailabilityResponse(
        boolean emailAvailable,
        boolean usernameAvailable
) {}