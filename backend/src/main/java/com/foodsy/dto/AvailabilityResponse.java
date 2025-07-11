package com.foodsy.dto;

public record AvailabilityResponse(
        boolean emailAvailable,
        boolean usernameAvailable
) {}