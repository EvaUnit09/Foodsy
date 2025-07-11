package com.foodsy.dto;

public record AuthResponse(
        String message,
        boolean success,
        UserDto user
) {}