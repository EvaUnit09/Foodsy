package com.foodsy.service;

import com.foodsy.domain.Session;
import com.foodsy.repository.SessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * Service responsible for automatically cleaning up expired sessions
 */
@Service
public class SessionCleanupService {
    
    private static final Logger logger = LoggerFactory.getLogger(SessionCleanupService.class);
    
    private final SessionRepository sessionRepository;
    private final SimpMessagingTemplate messagingTemplate;
    
    @Value("${session.timeout.inactive-minutes:30}")
    private int inactiveTimeoutMinutes;
    
    @Value("${session.timeout.max-duration-hours:1}")
    private int maxDurationHours;
    
    public SessionCleanupService(SessionRepository sessionRepository, 
                               SimpMessagingTemplate messagingTemplate) {
        this.sessionRepository = sessionRepository;
        this.messagingTemplate = messagingTemplate;
    }
    
    /**
     * Scheduled task that runs every 30 minutes to clean up expired sessions
     */
    @Scheduled(fixedRateString = "${session.cleanup.interval-minutes:30}", timeUnit = TimeUnit.MINUTES)
    @Transactional
    public void cleanupExpiredSessions() {
        logger.info("Starting scheduled session cleanup...");
        
        try {
            // Find sessions that should be expired
            List<Session> expiredSessions = findExpiredSessions();
            
            if (expiredSessions.isEmpty()) {
                logger.info("No expired sessions found");
                return;
            }
            
            logger.info("Found {} expired sessions to clean up", expiredSessions.size());
            
            // Mark sessions as expired and notify participants
            for (Session session : expiredSessions) {
                expireSession(session);
            }
            
            logger.info("Session cleanup completed successfully");
            
        } catch (Exception e) {
            logger.error("Error during session cleanup", e);
        }
    }
    
    /**
     * Find sessions that should be expired based on inactivity or max duration
     */
    private List<Session> findExpiredSessions() {
        Instant inactivityThreshold = Instant.now().minus(inactiveTimeoutMinutes, ChronoUnit.MINUTES);
        Instant maxDurationThreshold = Instant.now().minus(maxDurationHours, ChronoUnit.HOURS);
        
        // Find sessions that are either:
        // 1. Inactive for too long (lastActivityAt < threshold)
        // 2. Running for too long (createdAt < maxDurationThreshold)
        // Get all active sessions and filter them manually
        return sessionRepository.findActiveSessions().stream()
            .filter(session -> {
                // Check inactivity timeout
                if (session.getLastActivityAt() != null && 
                    session.getLastActivityAt().isBefore(inactivityThreshold)) {
                    return true;
                }
                // Check max duration
                if (session.getCreatedAt() != null && 
                    session.getCreatedAt().isBefore(maxDurationThreshold)) {
                    return true;
                }
                return false;
            })
            .toList();
    }
    
    /**
     * Mark a session as expired and notify all participants
     */
    @Transactional
    public void expireSession(Session session) {
        logger.info("Expiring session {} (joinCode: {})", session.getId(), session.getJoinCode());
        
        // Update session status
        session.setStatus("expired");
        sessionRepository.save(session);
        
        // Notify all participants via WebSocket
        try {
            messagingTemplate.convertAndSend(
                "/topic/session/" + session.getId(),
                new SessionEvent("session_expired", new SessionExpiredPayload(
                    session.getId(),
                    "Session has expired due to inactivity",
                    Instant.now()
                ))
            );
            
            logger.info("Notified participants of session {} expiration", session.getId());
            
        } catch (Exception e) {
            logger.error("Failed to notify participants of session {} expiration", session.getId(), e);
        }
    }
    
    /**
     * Manually expire a session (can be called from other services)
     */
    public void expireSessionManually(Long sessionId, String reason) {
        sessionRepository.findById(sessionId).ifPresent(session -> {
            logger.info("Manually expiring session {} - reason: {}", sessionId, reason);
            session.setStatus("expired");
            sessionRepository.save(session);
            
            // Notify participants
            try {
                messagingTemplate.convertAndSend(
                    "/topic/session/" + sessionId,
                    new SessionEvent("session_expired", new SessionExpiredPayload(
                        sessionId,
                        reason,
                        Instant.now()
                    ))
                );
            } catch (Exception e) {
                logger.error("Failed to notify participants of manual session expiration", e);
            }
        });
    }
    
    /**
     * Check if a session should be expired and expire it if needed
     */
    public boolean checkAndExpireIfNeeded(Session session) {
        if (session.isExpired() || shouldExpireSession(session)) {
            expireSession(session);
            return true;
        }
        return false;
    }
    
    /**
     * Check if a session should be expired based on business rules
     */
    private boolean shouldExpireSession(Session session) {
        if ("ended".equals(session.getStatus()) || "expired".equals(session.getStatus())) {
            return false; // Already ended/expired
        }
        
        Instant now = Instant.now();
        
        // Check inactivity timeout
        if (session.getLastActivityAt() != null) {
            Instant inactivityThreshold = now.minus(inactiveTimeoutMinutes, ChronoUnit.MINUTES);
            if (session.getLastActivityAt().isBefore(inactivityThreshold)) {
                logger.debug("Session {} should expire due to inactivity", session.getId());
                return true;
            }
        }
        
        // Check max duration
        Instant maxDurationThreshold = now.minus(maxDurationHours, ChronoUnit.HOURS);
        if (session.getCreatedAt().isBefore(maxDurationThreshold)) {
            logger.debug("Session {} should expire due to max duration", session.getId());
            return true;
        }
        
        return false;
    }
    
    // Event classes for WebSocket notifications
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
    
    public static class SessionExpiredPayload {
        private Long sessionId;
        private String reason;
        private Instant expiredAt;
        
        public SessionExpiredPayload(Long sessionId, String reason, Instant expiredAt) {
            this.sessionId = sessionId;
            this.reason = reason;
            this.expiredAt = expiredAt;
        }
        
        public Long getSessionId() { return sessionId; }
        public String getReason() { return reason; }
        public Instant getExpiredAt() { return expiredAt; }
    }
}