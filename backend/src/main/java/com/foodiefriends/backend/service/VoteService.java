package com.foodiefriends.backend.service;

import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.dto.VoteRequest;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class VoteService {
    private final SessionRestaurantRepository sessionRestaurantRepository;

    public VoteService(SessionRestaurantRepository sessionRestaurantRepository) {
        this.sessionRestaurantRepository = sessionRestaurantRepository;
    }
    public void processVote(VoteRequest voteRequest) {
        SessionRestaurant sessionRestaurant = sessionRestaurantRepository
                .findBySessionIdAndProviderId(voteRequest.sessionId(), voteRequest.providerId())
                .orElseThrow(() -> new EntityNotFoundException("SessionRestaurant not found"));

        if ("like".equalsIgnoreCase(voteRequest.voteType())) {
            sessionRestaurant.setLikeCount(sessionRestaurant.getLikeCount() + 1);

        }
        sessionRestaurantRepository.save(sessionRestaurant);
    }
}
