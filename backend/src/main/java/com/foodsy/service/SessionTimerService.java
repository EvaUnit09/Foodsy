package com.foodsy.service;

import com.foodsy.domain.Session;
import com.foodsy.repository.SessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class SessionTimerService {
    private static final Logger logger = LoggerFactory.getLogger(SessionTimerService.class);

    private final SimpMessagingTemplate messagingTemplate;
    private final SessionRepository sessionRepository;
    private final RoundService roundService;

    // Track active timers to prevent duplicates
    private final Set<String> activeTimers = ConcurrentHashMap.newKeySet();

    @Autowired
    public SessionTimerService(SimpMessagingTemplate messagingTemplate,
                              SessionRepository sessionRepository,
                              RoundService roundService) {
        this.messagingTemplate = messagingTemplate;
        this.sessionRepository = sessionRepository;
        this.roundService = roundService;
    }

    @Async
    public void startRoundTimer(Long sessionId, int round, Long unusedDurationMillis) throws InterruptedException {
        // Create unique timer key
        String timerKey = sessionId + "_round_" + round;
        
        // Check if timer is already running for this session/round
        if (!activeTimers.add(timerKey)) {
            logger.warn("Timer already running for session {} round {}, skipping duplicate", sessionId, round);
            return;
        }
        
        try {
            // 1. Fetch session and use its roundTime (in minutes) for timer duration
            Session session = sessionRepository.findById(sessionId).orElse(null);
            if (session == null) {
                logger.error("Session not found for timer: {}", sessionId);
                return;
            }
        int roundTimeMinutes = session.getRoundTime() != null ? session.getRoundTime() : 5; // default 5 min
        long durationMillis = roundTimeMinutes * 60_000L;

        long interval = 2000; // 2 second server broadcasts; client interpolates smoothly
        long millisLeft = durationMillis;
        while (millisLeft > 0) {
            // Send timerUpdate event with serverTime for client clock-sync
            messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId,
                Map.of(
                    "type", "timerUpdate",
                    "payload", Map.of(
                        "sessionId", sessionId,
                        "millisLeft", millisLeft,
                        "serverTime", System.currentTimeMillis()
                    )
                )
            );
            Thread.sleep(interval);
            millisLeft -= interval;
        }

        // Send final timer update when time reaches 0
        messagingTemplate.convertAndSend(
            "/topic/session/" + sessionId,
            Map.of(
                "type", "timerUpdate",
                "payload", Map.of(
                    "sessionId", sessionId,
                    "millisLeft", 0L,
                    "serverTime", System.currentTimeMillis()
                )
            )
        );
        // Timer expired — perform the actual DB transition and broadcast roundTransition.
        // RoundService handles top-K selection, DB writes, and the WS broadcast.
        // Guard against duplicate calls (e.g. host already pressed Complete Round 1).
        try {
            if (round == 1) {
                roundService.transitionToRound2(sessionId);
            }
        } catch (Exception e) {
            logger.warn("Round transition on timer expiry skipped (already transitioned?): {}", e.getMessage());
        }
        } finally {
            // Remove timer from active set when done
            activeTimers.remove(timerKey);
        }
    }
} 