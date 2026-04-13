package com.foodsy.service;

import com.foodsy.domain.*;
import com.foodsy.dto.VoteRequest;
import com.foodsy.repository.*;
import jakarta.persistence.EntityNotFoundException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional
public class VoteService {
    private static final Logger logger = LoggerFactory.getLogger(VoteService.class);

    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final SessionRepository sessionRepository;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final UserVoteQuotaRepository quotaRepository;
    private final SessionVoteHistoryRepository historyRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionService sessionService;
    private final RoundService roundService;

    public VoteService(SessionRestaurantRepository sessionRestaurantRepository,
                      SessionRepository sessionRepository,
                      SessionParticipantRepository sessionParticipantRepository,
                      UserVoteQuotaRepository quotaRepository,
                      SessionVoteHistoryRepository historyRepository,
                      SimpMessagingTemplate messagingTemplate,
                      SessionService sessionService,
                      RoundService roundService) {
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.sessionRepository = sessionRepository;
        this.sessionParticipantRepository = sessionParticipantRepository;
        this.quotaRepository = quotaRepository;
        this.historyRepository = historyRepository;
        this.messagingTemplate = messagingTemplate;
        this.sessionService = sessionService;
        this.roundService = roundService;
    }

    public void processVote(VoteRequest voteRequest) {
        // Validate session and get current round
        Session session = sessionRepository.findById(voteRequest.sessionId())
            .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        logger.debug("processVote called - sessionId: {}, userId: {}, providerId: {}, voteType: {}, currentRound: {}", voteRequest.sessionId(), voteRequest.userId(), voteRequest.providerId(), voteRequest.voteType(), session.getRound());

        // Update session activity when user votes
        sessionService.updateSessionActivity(session);

        // Ensure user has a vote quota for this round
        UserVoteQuota quota = ensureUserVoteQuota(voteRequest.sessionId(), voteRequest.userId(), session.getRound());
        
        logger.debug("Current quota before vote - votesUsed: {}, totalAllowed: {}, canVote: {}", quota.getVotesUsed(), quota.getTotalAllowed(), quota.canVote());
        
        // Check if user can still vote
        if (!quota.canVote()) {
            logger.debug("Vote rejected - user has exceeded voting limit");
            throw new RuntimeException("User has exceeded voting limit for this round");
        }
        
        // Check if user already voted for this restaurant in this round
        if (historyRepository.findBySessionIdAndUserIdAndProviderIdAndRound(
                voteRequest.sessionId(), voteRequest.userId(), voteRequest.providerId(), session.getRound()).isPresent()) {
            logger.debug("Vote rejected - user already voted for this restaurant in this round");
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
            logger.debug("Processing LIKE vote - incrementing quota");
            // Update quota
            quota.incrementVotesUsed();
            quotaRepository.save(quota);
            
            logger.debug("Quota after LIKE vote - votesUsed: {}, totalAllowed: {}", quota.getVotesUsed(), quota.getTotalAllowed());
            
            // Update restaurant like count
            sessionRestaurant.setLikeCount(sessionRestaurant.getLikeCount() + 1);
            sessionRestaurantRepository.save(sessionRestaurant);
        } else {
            logger.debug("Processing DISLIKE vote - not counting towards quota");
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

        logger.debug("Vote processed successfully");

        // Broadcast vote update via WebSocket
        broadcastVoteUpdate(voteRequest.sessionId(), session.getRound());

        // Auto-end round 1 if all active voters have used their quota
        if (voteRequest.voteType() == VoteType.LIKE && session.getRound() == 1) {
            checkAndAutoEndRound1(voteRequest.sessionId(), session.getRound());
        }
    }

    /**
     * Ensures a UserVoteQuota exists for the user in the given session/round
     */
    private UserVoteQuota ensureUserVoteQuota(Long sessionId, String userId, Integer round) {
        logger.debug("ensureUserVoteQuota called - sessionId: {}, userId: {}, round: {}", sessionId, userId, round);
        
        Optional<UserVoteQuota> existingQuota = quotaRepository.findBySessionIdAndUserIdAndRound(sessionId, userId, round);
        if (existingQuota.isPresent()) {
            UserVoteQuota quota = existingQuota.get();
            logger.debug("Found existing UserVoteQuota - ID: {}, maxVotes: {}, votesUsed: {}, remaining: {}", quota.getId(), quota.getTotalAllowed(), quota.getVotesUsed(), quota.getRemainingVotes());
            return quota;
        }
        
        logger.debug("Creating new UserVoteQuota for sessionId: {}, userId: {}, round: {}", sessionId, userId, round);
        
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));
        
        int maxVotes = (round == 1) ? (session.getLikesPerUser() != null ? session.getLikesPerUser() : 3) : 1;
        logger.debug("Session likesPerUser: {}, calculated maxVotes: {} for round {}", session.getLikesPerUser(), maxVotes, round);
        
        UserVoteQuota quota = new UserVoteQuota(sessionId, userId, round, maxVotes);
        UserVoteQuota savedQuota = quotaRepository.save(quota);
        logger.debug("Created UserVoteQuota with ID: {}, maxVotes: {}, votesUsed: {}, remaining: {}", savedQuota.getId(), savedQuota.getTotalAllowed(), savedQuota.getVotesUsed(), savedQuota.getRemainingVotes());
        return savedQuota;
    }

    /**
     * Triggers round 1 → round 2 transition if every participant who has voted
     * has exhausted their quota. Participants who joined but never voted have no
     * quota row and are intentionally excluded from this check.
     */
    private void checkAndAutoEndRound1(Long sessionId, int round) {
        try {
            List<UserVoteQuota> quotas = quotaRepository.findBySessionIdAndRound(sessionId, round);
            if (quotas.isEmpty()) return;
            boolean allExhausted = quotas.stream().allMatch(q -> q.getRemainingVotes() == 0);
            if (allExhausted) {
                logger.info("All active voters exhausted quota for session {} round {} — auto-ending round", sessionId, round);
                roundService.transitionToRound2(sessionId);
            }
        } catch (Exception e) {
            logger.warn("Auto-end round check skipped (already transitioned?): {}", e.getMessage());
        }
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
            logger.error("Failed to broadcast vote update: {}", e.getMessage(), e);
        }
    }


    /**
     * Get user's remaining likes for current round using UserVoteQuota
     */
    public int getRemainingLikes(String userId, Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        logger.debug("getRemainingLikes called - userId: {}, sessionId: {}, currentRound: {}", userId, sessionId, session.getRound());
        
        UserVoteQuota quota = ensureUserVoteQuota(sessionId, userId, session.getRound());
        int remaining = quota.getRemainingVotes();
        
        logger.debug("User {} has {} remaining votes (used: {}/{})", userId, remaining, quota.getVotesUsed(), quota.getTotalAllowed());
        
        return remaining;
    }

    /**
     * Reset user votes for a session (removes all vote quotas and history for this user/session)
     */
    public void resetUserVotesForSession(String userId, Long sessionId) {
        logger.debug("Resetting votes for userId: {}, sessionId: {}", userId, sessionId);
        
        // Delete all vote quotas for this user in this session
        List<UserVoteQuota> userQuotas = quotaRepository.findBySessionId(sessionId)
                .stream()
                .filter(quota -> quota.getUserId().equals(userId))
                .toList();
        quotaRepository.deleteAll(userQuotas);
        
        // Delete all vote history for this user in this session
        List<SessionVoteHistory> history = historyRepository.findBySessionIdAndUserId(sessionId, userId);
        historyRepository.deleteAll(history);
        
        logger.debug("Reset complete - removed {} quotas and {} history records for userId: {}, sessionId: {}", userQuotas.size(), history.size(), userId, sessionId);
    }

    /**
     * Submit batch votes for an OFFLINE session. LIKE only.
     */
    public Map<String, Object> submitOfflineVotes(Long sessionId, String userId, List<String> likedProviderIds) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        if (!"OFFLINE".equals(session.getSessionType()) && !"EVENT".equals(session.getSessionType())) {
            throw new RuntimeException("This endpoint is only for offline/event sessions");
        }
        if ("ENDED".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.GONE, "This session has been closed by the host");
        }
        if (!"voting".equals(session.getStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is not accepting votes");
        }
        if (session.getVotingDeadline() != null && Instant.now().isAfter(session.getVotingDeadline())) {
            throw new ResponseStatusException(HttpStatus.GONE, "The voting deadline has passed");
        }

        SessionParticipant participant = sessionParticipantRepository.findBySessionIdAndUserId(sessionId, userId)
                .orElseThrow(() -> new EntityNotFoundException("You are not a participant in this session"));

        if ("SUBMITTED".equals(participant.getVotingStatus())) {
            throw new RuntimeException("You have already submitted your votes");
        }

        List<SessionRestaurant> restaurants = sessionRestaurantRepository.findBySessionId(sessionId);

        // Deduplicate incoming provider IDs
        List<String> distinctIds = likedProviderIds.stream().distinct().toList();

        // Compute remaining likes budget (cap against likesPerUser)
        int maxLikes = session.getLikesPerUser() != null ? session.getLikesPerUser() : Integer.MAX_VALUE;
        long existingLikeCount = historyRepository.countBySessionIdAndUserIdAndRoundAndVoteType(
                sessionId, userId, 1, VoteType.LIKE);
        int budget = (int) Math.max(0, maxLikes - existingLikeCount);

        int applied = 0;
        for (String providerId : distinctIds) {
            if (applied >= budget) break;

            // Skip providers the user already voted for
            if (historyRepository.findBySessionIdAndUserIdAndProviderIdAndRound(
                    sessionId, userId, providerId, 1).isPresent()) {
                continue;
            }

            SessionRestaurant sr = restaurants.stream()
                    .filter(r -> r.getProviderId().equals(providerId))
                    .findFirst()
                    .orElse(null);
            if (sr == null) continue;

            sr.setLikeCount(sr.getLikeCount() + 1);
            sessionRestaurantRepository.save(sr);

            historyRepository.save(new SessionVoteHistory(sessionId, userId, providerId, 1, VoteType.LIKE));
            applied++;
        }

        participant.setVotingStatus("SUBMITTED");
        sessionParticipantRepository.save(participant);

        // Check if all participants have submitted
        List<SessionParticipant> allParticipants = sessionParticipantRepository.findBySessionId(sessionId);
        long submittedCount = allParticipants.stream()
                .filter(p -> "SUBMITTED".equals(p.getVotingStatus()))
                .count();

        if (submittedCount == allParticipants.size()) {
            completeOfflineSession(session);
        }

        return Map.of(
                "submitted", true,
                "submittedCount", submittedCount,
                "totalParticipants", allParticipants.size()
        );
    }

    /**
     * Force-complete an offline/event session (host action or scheduler).
     */
    public void completeOfflineSession(Session session) {
        session.setStatus("ENDED");
        sessionRepository.save(session);
        logger.info("Offline session {} completed", session.getId());
    }

    /**
     * Get voting progress for an offline session.
     */
    public Map<String, Object> getVotingProgress(Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
                .orElseThrow(() -> new EntityNotFoundException("Session not found"));

        // For EVENT sessions, exclude the host — they chose the restaurants and don't vote
        String creatorId = session.getCreatorId() != null ? session.getCreatorId().trim().toLowerCase() : "";
        boolean isEvent = "EVENT".equals(session.getSessionType());
        List<SessionParticipant> participants = sessionParticipantRepository.findBySessionId(sessionId)
                .stream()
                .filter(p -> !isEvent || !p.getUserId().trim().toLowerCase().equals(creatorId))
                .toList();
        long submittedCount = participants.stream()
                .filter(p -> "SUBMITTED".equals(p.getVotingStatus()))
                .count();

        List<Map<String, Object>> participantDetails = participants.stream()
                .map(p -> Map.<String, Object>of(
                        "userId", p.getUserId(),
                        "votingStatus", p.getVotingStatus() != null ? p.getVotingStatus() : "PENDING"
                ))
                .toList();

        return Map.of(
                "expectedParticipants", session.getExpectedParticipants() != null ? session.getExpectedParticipants() : 0,
                "joinedCount", participants.size(),
                "submittedCount", submittedCount,
                "votingDeadline", session.getVotingDeadline() != null ? session.getVotingDeadline().toString() : "",
                "participants", participantDetails
        );
    }
}
