package com.foodiefriends.backend.domain;

import com.fasterxml.jackson.annotation.JsonCreator;

public enum VoteType {
    LIKE,
    DISLIKE;
    @JsonCreator
    public static VoteType fromString(String value) {
        return value == null ? null : valueOf(value.trim().toUpperCase());
    }
}
