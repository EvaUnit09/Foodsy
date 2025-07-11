package com.foodsy.service;

import com.foodsy.domain.Session;
import com.foodsy.domain.SessionRestaurant;
import com.foodsy.repository.SessionRepository;
import com.foodsy.repository.SessionRestaurantRepository;
import com.foodsy.repository.SessionParticipantRepository;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

@Service
@Transactional
public class RoundService {
    
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final SessionParticipantRepository sessionParticipantRepository;
    private final SimpMessagingTemplate messagingTemplate;
    
    public RoundService(SessionRepository sessionRepository,
                       SessionRestaurantRepository sessionRestaurantRepository,
                       SessionParticipantRepository sessionParticipantRepository,
                       SimpMessagingTemplate messagingTemplate) {
        this.sessionRepository = sessionRepository;
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.sessionParticipantRepository = sessionParticipantRepository;
        this.messagingTemplate = messagingTemplate;
    }
    
    /**
     * Calculate Top K restaurants after round 1 and prepare for round 2
     * K = min(5, group_size + 2)
     */
    public void transitionToRound2(Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
            
        if (session.getRound() != 1) {
            throw new RuntimeException("Can only transition to round 2 from round 1");
        }
        
        // Calculate group size
        int groupSize = sessionParticipantRepository.countBySessionId(sessionId);
        int topK = Math.min(5, groupSize + 2);
        
        // Get top K restaurants from round 1 ordered by like count
        List<SessionRestaurant> topRestaurants = sessionRestaurantRepository
            .findBySessionIdAndRoundOrderByLikeCountDesc(sessionId, 1)
            .stream()
            .limit(topK)
            .toList();
        
        // Create round 2 entries for top K restaurants
        for (SessionRestaurant restaurant : topRestaurants) {
            SessionRestaurant round2Restaurant = new SessionRestaurant();
            round2Restaurant.setSessionId(sessionId);
            round2Restaurant.setProviderId(restaurant.getProviderId());
            round2Restaurant.setName(restaurant.getName());
            round2Restaurant.setAddress(restaurant.getAddress());
            round2Restaurant.setCategory(restaurant.getCategory());
            round2Restaurant.setPriceLevel(restaurant.getPriceLevel());
            round2Restaurant.setPriceRange(restaurant.getPriceRange());
            round2Restaurant.setRating(restaurant.getRating());
            round2Restaurant.setUserRatingCount(restaurant.getUserRatingCount());
            round2Restaurant.setCurrentOpeningHours(restaurant.getCurrentOpeningHours());
            round2Restaurant.setGenerativeSummary(restaurant.getGenerativeSummary());
            round2Restaurant.setReviewSummary(restaurant.getReviewSummary());
            round2Restaurant.setRound(2);
            round2Restaurant.setLikeCount(0); // Reset vote count for round 2
            
            sessionRestaurantRepository.save(round2Restaurant);
        }
        
        // Update session to round 2
        session.setRound(2);
        session.setStatus("round2");
        sessionRepository.save(session);
        
        // Broadcast round transition event
        messagingTemplate.convertAndSend(
            "/topic/session/" + sessionId,
            Map.of(
                "type", "roundTransition",
                "payload", Map.of(
                    "sessionId", sessionId,
                    "newRound", 2,
                    "topKRestaurants", topRestaurants.size(),
                    "message", "Round 1 complete! Top " + topK + " restaurants selected for final round."
                )
            )
        );
    }
    
    /**
     * Complete the voting session and determine the winner
     */
    public void completeSession(Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
            
        if (session.getRound() != 2) {
            throw new RuntimeException("Can only complete session from round 2");
        }
        
        // Get round 2 restaurants
        List<SessionRestaurant> round2Results = sessionRestaurantRepository
            .findBySessionIdAndRoundOrderByLikeCountDesc(sessionId, 2);
        
        if (round2Results.isEmpty()) {
            throw new RuntimeException("No restaurants found for round 2");
        }
        
        // Get round 1 restaurants for vote aggregation
        List<SessionRestaurant> round1Results = sessionRestaurantRepository
            .findBySessionIdAndRound(sessionId, 1);
        
        // Create aggregated results with cumulative vote counts
        List<Map<String, Object>> aggregatedResults = round2Results.stream()
            .<Map<String, Object>>map(r2 -> {
                // Find corresponding round 1 restaurant by providerId
                int round1Votes = round1Results.stream()
                    .filter(r1 -> r1.getProviderId().equals(r2.getProviderId()))
                    .findFirst()
                    .map(SessionRestaurant::getLikeCount)
                    .orElse(0);
                
                int totalVotes = r2.getLikeCount() + round1Votes;
                
                // Use HashMap to avoid Map.of() limitations
                Map<String, Object> result = new java.util.HashMap<>();
                result.put("id", r2.getId());
                result.put("providerId", r2.getProviderId());
                result.put("name", r2.getName());
                result.put("address", r2.getAddress());
                result.put("category", r2.getCategory());
                result.put("rating", r2.getRating() != null ? r2.getRating() : 0.0);
                result.put("userRatingCount", r2.getUserRatingCount() != null ? r2.getUserRatingCount() : 0);
                result.put("currentOpeningHours", r2.getCurrentOpeningHours() != null ? r2.getCurrentOpeningHours() : "");
                result.put("generativeSummary", r2.getGenerativeSummary() != null ? r2.getGenerativeSummary() : "");
                result.put("reviewSummary", r2.getReviewSummary() != null ? r2.getReviewSummary() : "");
                result.put("priceRange", r2.getPriceRange() != null ? r2.getPriceRange() : "");
                result.put("voteCount", totalVotes);
                result.put("round1Votes", round1Votes);
                result.put("round2Votes", r2.getLikeCount());
                return result;
            })
            .sorted((a, b) -> Integer.compare((Integer) b.get("voteCount"), (Integer) a.get("voteCount")))
            .toList();
        
        Map<String, Object> winner = aggregatedResults.get(0);
        
        // Update session status
        session.setStatus("completed");
        sessionRepository.save(session);
        
        // Broadcast session completion event with aggregated vote counts
        messagingTemplate.convertAndSend(
            "/topic/session/" + sessionId,
            Map.of(
                "type", "sessionComplete",
                "payload", Map.of(
                    "sessionId", sessionId,
                    "winner", winner,
                    "finalResults", aggregatedResults
                )
            )
        );
    }
    
    /**
     * Check if round 1 is complete (all users voted or time expired)
     */
    public boolean isRound1Complete(Long sessionId) {
        // This would typically check if all users have used their likes
        // or if the timer has expired. For now, we'll implement basic logic.
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
            
        return session.getRound() == 1 && session.getStatus().equals("round1_complete");
    }
    
    /**
     * Check if round 2 is complete (all users voted or time expired)
     */
    public boolean isRound2Complete(Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
            
        return session.getRound() == 2 && session.getStatus().equals("round2_complete");
    }
    
    /**
     * Get the current round status for a session
     */
    public Map<String, Object> getRoundStatus(Long sessionId) {
        Session session = sessionRepository.findById(sessionId)
            .orElseThrow(() -> new RuntimeException("Session not found"));
            
        return Map.of(
            "currentRound", session.getRound(),
            "status", session.getStatus(),
            "likesPerUser", session.getLikesPerUser()
        );
    }
}