package com.foodiefriends.backend.controller;

import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Instant;
import java.util.List;
import java.util.Map;

import com.foodiefriends.backend.service.SessionTimerService;

@Controller
public class SessionEventsController {
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionTimerService sessionTimerService;

    @Autowired
    public SessionEventsController(SimpMessagingTemplate messagingTemplate, SessionTimerService sessionTimerService) {
        this.messagingTemplate = messagingTemplate;
        this.sessionTimerService = sessionTimerService;
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

    // Round transition event (host or backend triggers)
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