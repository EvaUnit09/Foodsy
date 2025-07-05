package com.foodiefriends.backend.service;

import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.domain.VoteType;
import com.foodiefriends.backend.dto.VoteRequest;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import com.foodiefriends.backend.repository.SessionRestaurantVoteRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional
public class VoteService {
    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final SessionRepository sessionRepository;
    private final SessionRestaurantVoteRepository voteRepository;

    public VoteService(SessionRestaurantRepository sessionRestaurantRepository,
                      SessionRepository sessionRepository,
                      SessionRestaurantVoteRepository voteRepository) {
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.sessionRepository = sessionRepository;
        this.voteRepository = voteRepository;
    }

    public void processVote(VoteRequest voteRequest) {
        // Get session to check current round and rules
        Session session = sessionRepository.findById(voteRequest.sessionId())
            .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        // Find the restaurant in the current round
        SessionRestaurant sessionRestaurant = sessionRestaurantRepository
                .findBySessionIdAndRound(voteRequest.sessionId(), session.getRound())
                .stream()
                .filter(r -> r.getProviderId().equals(voteRequest.providerId()))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found in current round"));

        // Check voting limits based on current round
        if (!canUserVote(voteRequest.userId(), voteRequest.sessionId(), session.getRound(), voteRequest.voteType())) {
            throw new RuntimeException("User has exceeded voting limit for this round");
        }

        if (voteRequest.voteType() == VoteType.LIKE) {
            sessionRestaurant.setLikeCount(sessionRestaurant.getLikeCount() + 1);
        }
        
        sessionRestaurantRepository.save(sessionRestaurant);
    }

    /**
     * Check if user can vote based on round rules:
     * Round 1: Limited likes per user (configurable)
     * Round 2: Only 1 vote per user total
     */
    private boolean canUserVote(String userId, Long sessionId, Integer round, VoteType voteType) {
        if (voteType != VoteType.LIKE) {
            return true; // PASS votes are unlimited
        }

        // Count user's existing likes in this round
        int userLikesInRound = voteRepository.countBySessionIdAndUserIdAndRoundAndVoteType(
            sessionId, userId, round, VoteType.LIKE);

        if (round == 1) {
            // Round 1: Check against likes per user limit
            Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));
            return userLikesInRound < session.getLikesPerUser();
        } else if (round == 2) {
            // Round 2: Only 1 vote total per user
            return userLikesInRound < 1;
        }

        return false;
    }

    /**
     * Get user's remaining likes for current round
     */
    public int getRemainingLikes(String userId, Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        int userLikes = voteRepository.countBySessionIdAndUserIdAndRoundAndVoteType(
            sessionId, userId, session.getRound(), VoteType.LIKE);

        if (session.getRound() == 1) {
            return Math.max(0, session.getLikesPerUser() - userLikes);
        } else if (session.getRound() == 2) {
            return Math.max(0, 1 - userLikes);
        }

        return 0;
    }
}
