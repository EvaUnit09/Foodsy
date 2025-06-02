package com.foodiefriends.backend.dto;

import com.foodiefriends.backend.domain.VoteType;

public record VoteRequest(
        Long sessionId,
        String providerId,
        String userId,
        VoteType voteType // "like" or "dislike"
) {}
