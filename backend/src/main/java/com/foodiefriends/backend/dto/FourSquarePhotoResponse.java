package com.foodiefriends.backend.dto;

public record FourSquarePhotoResponse(
        String id,
        String created_at,
        String prefix,
        String suffix,
        Integer width,
        Integer height
) {}


