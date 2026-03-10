package com.foodsy.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import com.foodsy.domain.SessionParticipant;

import java.util.List;
import java.util.Optional;


public interface SessionParticipantRepository extends JpaRepository<SessionParticipant, Long> {
    List<SessionParticipant> findBySessionId(Long sessionId);
    Optional<SessionParticipant> findBySessionIdAndUserId(Long sessionId, String userId);
    int countBySessionId(Long sessionId);

    @Query("SELECT p.session.id FROM SessionParticipant p WHERE p.userId = :userId")
    List<Long> findSessionIdsByUserId(@Param("userId") String userId);
}
