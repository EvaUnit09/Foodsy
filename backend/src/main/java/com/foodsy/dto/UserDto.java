package com.foodsy.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import com.fasterxml.jackson.annotation.JsonProperty;
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
        String customAvatarUrl,
        String effectiveAvatarUrl,
        String homeBorough,
        String homeNeighborhood,
        @JsonProperty("provider") AuthProvider provider,
        @JsonProperty("emailVerified") boolean emailVerified,
        @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss") LocalDateTime createdAt
) {}
