package com.foodsy.service;

import com.foodsy.domain.*;
import com.foodsy.dto.VoteRequest;
import com.foodsy.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

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

        System.out.println("DEBUG: processVote called - sessionId: " + voteRequest.sessionId() + ", userId: " + voteRequest.userId() + ", providerId: " + voteRequest.providerId() + ", voteType: " + voteRequest.voteType() + ", currentRound: " + session.getRound());

        // Ensure user has a vote quota for this round
        UserVoteQuota quota = ensureUserVoteQuota(voteRequest.sessionId(), voteRequest.userId(), session.getRound());
        
        System.out.println("DEBUG: Current quota before vote - votesUsed: " + quota.getVotesUsed() + ", totalAllowed: " + quota.getTotalAllowed() + ", canVote: " + quota.canVote());
        
        // Check if user can still vote
        if (!quota.canVote()) {
            System.out.println("DEBUG: Vote rejected - user has exceeded voting limit");
            throw new RuntimeException("User has exceeded voting limit for this round");
        }
        
        // Check if user already voted for this restaurant in this round
        if (historyRepository.findBySessionIdAndUserIdAndProviderIdAndRound(
                voteRequest.sessionId(), voteRequest.userId(), voteRequest.providerId(), session.getRound()).isPresent()) {
            System.out.println("DEBUG: Vote rejected - user already voted for this restaurant in this round");
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
            System.out.println("DEBUG: Processing LIKE vote - incrementing quota");
            // Update quota
            quota.incrementVotesUsed();
            quotaRepository.save(quota);
            
            System.out.println("DEBUG: Quota after LIKE vote - votesUsed: " + quota.getVotesUsed() + ", totalAllowed: " + quota.getTotalAllowed());
            
            // Update restaurant like count
            sessionRestaurant.setLikeCount(sessionRestaurant.getLikeCount() + 1);
            sessionRestaurantRepository.save(sessionRestaurant);
        } else {
            System.out.println("DEBUG: Processing DISLIKE vote - not counting towards quota");
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

        System.out.println("DEBUG: Vote processed successfully");

        // Broadcast vote update via WebSocket
        broadcastVoteUpdate(voteRequest.sessionId(), session.getRound());
    }

    /**
     * Ensures a UserVoteQuota exists for the user in the given session/round
     */
    private UserVoteQuota ensureUserVoteQuota(Long sessionId, String userId, Integer round) {
        System.out.println("DEBUG: ensureUserVoteQuota called - sessionId: " + sessionId + ", userId: " + userId + ", round: " + round);
        
        Optional<UserVoteQuota> existingQuota = quotaRepository.findBySessionIdAndUserIdAndRound(sessionId, userId, round);
        if (existingQuota.isPresent()) {
            UserVoteQuota quota = existingQuota.get();
            System.out.println("DEBUG: Found existing UserVoteQuota - ID: " + quota.getId() + ", maxVotes: " + quota.getTotalAllowed() + ", votesUsed: " + quota.getVotesUsed() + ", remaining: " + quota.getRemainingVotes());
            return quota;
        }
        
        System.out.println("DEBUG: Creating new UserVoteQuota for sessionId: " + sessionId + ", userId: " + userId + ", round: " + round);
        
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));
        
        int maxVotes = (round == 1) ? (session.getLikesPerUser() != null ? session.getLikesPerUser() : 3) : 1;
        System.out.println("DEBUG: Session likesPerUser: " + session.getLikesPerUser() + ", calculated maxVotes: " + maxVotes + " for round " + round);
        
        UserVoteQuota quota = new UserVoteQuota(sessionId, userId, round, maxVotes);
        UserVoteQuota savedQuota = quotaRepository.save(quota);
        System.out.println("DEBUG: Created UserVoteQuota with ID: " + savedQuota.getId() + ", maxVotes: " + savedQuota.getTotalAllowed() + ", votesUsed: " + savedQuota.getVotesUsed() + ", remaining: " + savedQuota.getRemainingVotes());
        return savedQuota;
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

        System.out.println("DEBUG: getRemainingLikes called - userId: " + userId + ", sessionId: " + sessionId + ", currentRound: " + session.getRound());
        
        UserVoteQuota quota = ensureUserVoteQuota(sessionId, userId, session.getRound());
        int remaining = quota.getRemainingVotes();
        
        System.out.println("DEBUG: User " + userId + " has " + remaining + " remaining votes (used: " + quota.getVotesUsed() + "/" + quota.getTotalAllowed() + ")");
        
        return remaining;
    }

    /**
     * Reset user votes for a session (removes all vote quotas and history for this user/session)
     */
    public void resetUserVotesForSession(String userId, Long sessionId) {
        System.out.println("DEBUG: Resetting votes for userId: " + userId + ", sessionId: " + sessionId);
        
        // Delete all vote quotas for this user in this session
        List<UserVoteQuota> userQuotas = quotaRepository.findBySessionId(sessionId)
                .stream()
                .filter(quota -> quota.getUserId().equals(userId))
                .toList();
        quotaRepository.deleteAll(userQuotas);
        
        // Delete all vote history for this user in this session
        List<SessionVoteHistory> history = historyRepository.findBySessionIdAndUserId(sessionId, userId);
        historyRepository.deleteAll(history);
        
        System.out.println("DEBUG: Reset complete - removed " + userQuotas.size() + " quotas and " + history.size() + " history records for userId: " + userId + ", sessionId: " + sessionId);
    }
}
