package com.foodsy.service;

import com.foodsy.domain.Session;
import com.foodsy.repository.SessionRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;
import java.util.List;

@Component
public class OfflineSessionScheduler {
    private static final Logger logger = LoggerFactory.getLogger(OfflineSessionScheduler.class);

    private final SessionRepository sessionRepository;
    private final VoteService voteService;

    public OfflineSessionScheduler(SessionRepository sessionRepository, VoteService voteService) {
        this.sessionRepository = sessionRepository;
        this.voteService = voteService;
    }

    @Scheduled(fixedRate = 120_000) // every 2 minutes
    public void autoCompletePastDeadlineSessions() {
        List<Session> sessions = sessionRepository.findPastDeadlineOfflineSessions(Instant.now());
        for (Session session : sessions) {
            try {
                voteService.completeOfflineSession(session);
                logger.info("Auto-completed session {} (type={}) past deadline", session.getId(), session.getSessionType());
            } catch (Exception e) {
                logger.error("Failed to auto-complete session {}: {}", session.getId(), e.getMessage());
            }
        }
    }
}
