package com.foodiefriends.backend.dto;

public record VoteRequest(
        Long sessionId,
        String providerId,
        String userId,
        String voteType // "like" or "dislike"
) {
}
