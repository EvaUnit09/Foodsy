package com.foodiefriends.backend.dto;

public record AuthResponse(
        String message,
        boolean success,
        UserDto user
) {}