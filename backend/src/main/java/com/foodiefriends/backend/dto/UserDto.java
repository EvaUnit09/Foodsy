package com.foodiefriends.backend.dto;

import com.foodiefriends.backend.domain.DietaryPreference;
import com.foodiefriends.backend.domain.AuthProvider;

import java.time.Instant;
import java.util.Set;

public record UserDto(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String displayName,
        String avatarUrl,
        Set<DietaryPreference> dietaryPreferences,
        Set<String> foodAllergies,
        AuthProvider provider,
        Boolean emailVerified,
        Instant createdAt
) {}