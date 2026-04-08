package com.foodsy.dto;

public record ProfileUpdateRequest(
        String username,
        String homeBorough,
        String homeNeighborhood,
        Boolean useGoogleAvatar
) {}
