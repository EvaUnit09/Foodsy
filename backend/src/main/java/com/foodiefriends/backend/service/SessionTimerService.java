package com.foodiefriends.backend.service;

import com.foodiefriends.backend.domain.Session;
import com.foodiefriends.backend.domain.SessionRestaurant;
import com.foodiefriends.backend.repository.SessionRepository;
import com.foodiefriends.backend.repository.SessionRestaurantRepository;
import com.foodiefriends.backend.repository.SessionParticipantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.stereotype.Service;

import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

@Service
@EnableAsync
public class SessionTimerService {
    private final SimpMessagingTemplate messagingTemplate;
    private final SessionRepository sessionRepository;
    private final SessionRestaurantRepository sessionRestaurantRepository;
    private final SessionParticipantRepository sessionParticipantRepository;
    
    // Track active timers to prevent duplicates
    private final Set<String> activeTimers = ConcurrentHashMap.newKeySet();

    @Autowired
    public SessionTimerService(SimpMessagingTemplate messagingTemplate,
                              SessionRepository sessionRepository,
                              SessionRestaurantRepository sessionRestaurantRepository,
                              SessionParticipantRepository sessionParticipantRepository) {
        this.messagingTemplate = messagingTemplate;
        this.sessionRepository = sessionRepository;
        this.sessionRestaurantRepository = sessionRestaurantRepository;
        this.sessionParticipantRepository = sessionParticipantRepository;
    }

    @Async
    public void startRoundTimer(Long sessionId, int round, Long unusedDurationMillis) throws InterruptedException {
        // Create unique timer key
        String timerKey = sessionId + "_round_" + round;
        
        // Check if timer is already running for this session/round
        if (!activeTimers.add(timerKey)) {
            System.err.println("Timer already running for session " + sessionId + " round " + round + ", skipping duplicate");
            return;
        }
        
        try {
            // 1. Fetch session and use its roundTime (in minutes) for timer duration
            Session session = sessionRepository.findById(sessionId).orElse(null);
            if (session == null) {
                System.err.println("Session not found for timer: " + sessionId);
                return;
            }
        int roundTimeMinutes = session.getRoundTime() != null ? session.getRoundTime() : 5; // default 5 min
        long durationMillis = roundTimeMinutes * 60_000L;

        long interval = 1000; // 1 second updates
        long millisLeft = durationMillis;
        while (millisLeft > 0) {
            // Send timerUpdate event
            messagingTemplate.convertAndSend(
                "/topic/session/" + sessionId,
                Map.of(
                    "type", "timerUpdate",
                    "payload", Map.of(
                        "sessionId", sessionId,
                        "millisLeft", millisLeft
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
                    "millisLeft", 0L
                )
            )
        );
        // 2. On timer expiry, calculate real top K restaurants for this round
        List<SessionRestaurant> restaurants = sessionRestaurantRepository.findBySessionId(sessionId)
            .stream()
            .filter(r -> r.getRound() == round)
            .sorted(Comparator.comparing(SessionRestaurant::getLikeCount).reversed())
            .collect(Collectors.toList());
        int groupSize = sessionParticipantRepository.findBySessionId(sessionId).size();
        int k = Math.min(5, groupSize + 2);
        List<String> topK = restaurants.stream()
            .limit(k)
            .map(SessionRestaurant::getName)
            .collect(Collectors.toList());
        // Timer expired, send roundTransition event with real top K
        messagingTemplate.convertAndSend(
            "/topic/session/" + sessionId,
            Map.of(
                "type", "roundTransition",
                "payload", Map.of(
                    "sessionId", sessionId,
                    "newRound", round + 1,
                    "topK", topK
                )
            )
        );
        } finally {
            // Remove timer from active set when done
            activeTimers.remove(timerKey);
        }
    }
} 