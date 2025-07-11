package com.foodsy.dto;

import com.foodsy.domain.VoteType;

public record VoteRequest(
        Long sessionId,
        String providerId,
        String userId,
        VoteType voteType // "like" or "dislike"
) {}
