package com.foodiefriends.backend.service;

import com.foodiefriends.backend.domain.*;
import com.foodiefriends.backend.dto.VoteRequest;
import com.foodiefriends.backend.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class VoteService {
    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final SessionRepository sessionRepository;
    private final SessionRestaurantVoteRepository voteRepository;
    private final UserVoteQuotaRepository quotaRepository;
    private final SessionVoteHistoryRepository historyRepository;
    private final SessionParticipantRepository participantRepository;
    private final SimpMessagingTemplate messagingTemplate;

    public VoteService(SessionRestaurantRepository sessionRestaurantRepository,
                      SessionRepository sessionRepository,
                      SessionRestaurantVoteRepository voteRepository,
                      UserVoteQuotaRepository quotaRepository,
                      SessionVoteHistoryRepository historyRepository,
                      SessionParticipantRepository participantRepository,
                      SimpMessagingTemplate messagingTemplate) {
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.sessionRepository = sessionRepository;
        this.voteRepository = voteRepository;
        this.quotaRepository = quotaRepository;
        this.historyRepository = historyRepository;
        this.participantRepository = participantRepository;
        this.messagingTemplate = messagingTemplate;
    }

    public void processVote(VoteRequest voteRequest) {
        // Validate session and get current round
        Session session = sessionRepository.findById(voteRequest.sessionId())
            .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        // Ensure user has a vote quota for this round
        UserVoteQuota quota = ensureUserVoteQuota(voteRequest.sessionId(), voteRequest.userId(), session.getRound());
        
        // Check if user can still vote
        if (!quota.canVote()) {
            throw new RuntimeException("User has exceeded voting limit for this round");
        }
        
        // Check if user already voted for this restaurant in this round
        if (historyRepository.findBySessionIdAndUserIdAndProviderIdAndRound(
                voteRequest.sessionId(), voteRequest.userId(), voteRequest.providerId(), session.getRound()).isPresent()) {
            throw new RuntimeException("User has already voted for this restaurant in this round");
        }

        // Find the restaurant in the current round
        SessionRestaurant sessionRestaurant = sessionRestaurantRepository
                .findBySessionIdAndRound(voteRequest.sessionId(), session.getRound())
                .stream()
                .filter(r -> r.getProviderId().equals(voteRequest.providerId()))
                .findFirst()
                .orElseThrow(() -> new EntityNotFoundException("Restaurant not found in current round"));

        // Only count LIKE votes towards quota
        if (voteRequest.voteType() == VoteType.LIKE) {
            // Update quota
            quota.incrementVotesUsed();
            quotaRepository.save(quota);
            
            // Update restaurant like count
            sessionRestaurant.setLikeCount(sessionRestaurant.getLikeCount() + 1);
            sessionRestaurantRepository.save(sessionRestaurant);
        }

        // Save vote history (for both LIKE and DISLIKE)
        SessionVoteHistory history = new SessionVoteHistory(
                voteRequest.sessionId(),
                voteRequest.userId(),
                voteRequest.providerId(),
                session.getRound(),
                voteRequest.voteType()
        );
        historyRepository.save(history);

        // Broadcast vote update via WebSocket
        broadcastVoteUpdate(voteRequest.sessionId(), session.getRound());
    }

    /**
     * Ensures a UserVoteQuota exists for the user in the given session/round
     */
    private UserVoteQuota ensureUserVoteQuota(Long sessionId, String userId, Integer round) {
        return quotaRepository.findBySessionIdAndUserIdAndRound(sessionId, userId, round)
                .orElseGet(() -> {
                    Session session = sessionRepository.findById(sessionId)
                            .orElseThrow(() -> new EntityNotFoundException("Session not found"));
                    
                    int maxVotes = (round == 1) ? session.getLikesPerUser() : 1;
                    
                    UserVoteQuota quota = new UserVoteQuota(sessionId, userId, round, maxVotes);
                    return quotaRepository.save(quota);
                });
    }

    /**
     * Broadcasts vote updates to all session participants via WebSocket
     */
    private void broadcastVoteUpdate(Long sessionId, Integer round) {
        try {
            // Get updated restaurant data for the current round
            List<SessionRestaurant> restaurants = sessionRestaurantRepository
                    .findBySessionIdAndRound(sessionId, round);
            
            // Broadcast to session participants
            messagingTemplate.convertAndSend("/topic/session/" + sessionId + "/votes", restaurants);
        } catch (Exception e) {
            System.err.println("Failed to broadcast vote update: " + e.getMessage());
        }
    }


    /**
     * Get user's remaining likes for current round using UserVoteQuota
     */
    public int getRemainingLikes(String userId, Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        UserVoteQuota quota = ensureUserVoteQuota(sessionId, userId, session.getRound());
        return quota.getRemainingVotes();
    }
}
