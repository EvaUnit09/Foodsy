package com.foodsy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import com.foodsy.domain.SessionParticipant;

import java.util.List;
import java.util.Optional;


public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {
    List<SessionParticipant> findBySessionId(Long sessionId);
    Optional<SessionParticipant> findBySessionIdAndUserId(Long sessionId, String userId);
    int countBySessionId(Long sessionId);
}
