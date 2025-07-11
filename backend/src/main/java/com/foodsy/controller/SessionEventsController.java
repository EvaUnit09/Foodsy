package com.foodsy.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.foodsy.service.SessionTimerService;
import com.foodsy.service.SessionService;
import com.foodsy.service.RoundService;
import com.foodsy.dto.RestaurantDto;

@Controller
public class SessionEventsController {
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionTimerService sessionTimerService;
    private final SessionService sessionService;
    private final RoundService roundService;

    @Autowired
    public SessionEventsController(SimpMessagingTemplate messagingTemplate, 
                                 SessionTimerService sessionTimerService, 
                                 SessionService sessionService,
                                 RoundService roundService) {
        this.messagingTemplate = messagingTemplate;
        this.sessionTimerService = sessionTimerService;
        this.sessionService = sessionService;
        this.roundService = roundService;
    }

    // Common event envelope
    public static class SessionEvent {
        private String type;
        private Object payload;

        public SessionEvent(String type, Object payload) {
            this.type = type;
            this.payload = payload;
        }
        public String getType() { return type; }
        public Object getPayload() { return payload; }
    }

    // Host triggers session start
    @MessageMapping("/session/{sessionId}/start")
    public void startSession(@DestinationVariable Long sessionId) {
        SessionEvent event = new SessionEvent(
            "sessionStarted",
            Map.of(
                "sessionId", sessionId,
                "startTime", Instant.now().toString()
            )
        );
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, event);
        // Start the round timer (5 minutes = 300000 ms)
        try {
            sessionTimerService.startRoundTimer(sessionId, 1, 300_000L);
        } catch (Exception e) {
            System.err.println("Failed to start round timer: " + e.getMessage());
        }
    }

    // Timer update event (can be called by backend timer service)
    @MessageMapping("/session/{sessionId}/timerUpdate")
    public void timerUpdate(@DestinationVariable Long sessionId, Long millisLeft) {
        SessionEvent event = new SessionEvent(
            "timerUpdate",
            Map.of(
                "sessionId", sessionId,
                "millisLeft", millisLeft
            )
        );
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, event);
    }

    // Round 1 complete - transition to round 2 (host triggers)
    @MessageMapping("/session/{sessionId}/completeRound1")
    public void completeRound1(@DestinationVariable Long sessionId) {
        try {
            // Use RoundService to handle the transition
            roundService.transitionToRound2(sessionId);
        } catch (Exception e) {
            System.err.println("Failed to complete round 1: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Round 2 complete - finish session and show results (host triggers)
    @MessageMapping("/session/{sessionId}/completeRound2") 
    public void completeRound2(@DestinationVariable Long sessionId) {
        try {
            // Use RoundService to complete the session
            roundService.completeSession(sessionId);
        } catch (Exception e) {
            System.err.println("Failed to complete round 2: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Get current round status (can be called by frontend)
    @MessageMapping("/session/{sessionId}/getRoundStatus")
    public void getRoundStatus(@DestinationVariable Long sessionId) {
        try {
            Map<String, Object> roundStatus = roundService.getRoundStatus(sessionId);
            SessionEvent event = new SessionEvent(
                "roundStatus",
                roundStatus
            );
            messagingTemplate.convertAndSend("/topic/session/" + sessionId, event);
        } catch (Exception e) {
            System.err.println("Failed to get round status: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Legacy round transition method (kept for compatibility)
    @MessageMapping("/session/{sessionId}/roundTransition")
    public void roundTransition(@DestinationVariable Long sessionId, RoundTransitionPayload payload) {
        SessionEvent event = new SessionEvent(
            "roundTransition",
            Map.of(
                "sessionId", sessionId,
                "newRound", payload.getNewRound(),
                "topK", payload.getTopK()
            )
        );
        messagingTemplate.convertAndSend("/topic/session/" + sessionId, event);
    }

    // Session end event (host or backend triggers)
    @MessageMapping("/session/{sessionId}/end")
    public void endSession(@DestinationVariable Long sessionId) {
        // Calculate final results and update session status
        try {
            List<RestaurantDto> finalRankings = sessionService.getFinalRankings(sessionId);
            RestaurantDto winner = sessionService.getWinner(sessionId);
            int totalParticipants = sessionService.getParticipants(sessionId).size();
            int totalVotes = sessionService.getTotalVotes(sessionId);
            
            // Update session status to ENDED
            sessionService.endSession(sessionId);
            
            SessionEvent event = new SessionEvent(
                "sessionEnd",
                Map.of(
                    "sessionId", sessionId,
                    "endTime", Instant.now().toString(),
                    "winner", winner,
                    "finalRankings", finalRankings,
                    "totalParticipants", totalParticipants,
                    "totalVotes", totalVotes
                )
            );
            messagingTemplate.convertAndSend("/topic/session/" + sessionId, event);
        } catch (Exception e) {
            System.err.println("Failed to end session: " + e.getMessage());
            e.printStackTrace();
        }
    }

    // Public method to broadcast session end (can be called by services)
    public void broadcastSessionEnd(Long sessionId) {
        endSession(sessionId);
    }

    // Payload for round transition
    public static class RoundTransitionPayload {
        private int newRound;
        private List<String> topK;
        public int getNewRound() { return newRound; }
        public void setNewRound(int newRound) { this.newRound = newRound; }
        public List<String> getTopK() { return topK; }
        public void setTopK(List<String> topK) { this.topK = topK; }
    }

} 