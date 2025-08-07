package com.foodsy.dto;

import com.foodsy.domain.AuthProvider;

import java.time.LocalDateTime;

public record UserDto(
        Long id,
        String username,
        String email,
        String firstName,
        String lastName,
        String displayName,
        String avatarUrl,
        AuthProvider provider,
        boolean emailVerified,
        LocalDateTime createdAt
) {}