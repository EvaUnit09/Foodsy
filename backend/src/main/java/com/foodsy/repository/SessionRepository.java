package com.foodsy.repository;

import com.foodsy.domain.Session;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;
import java.util.Optional;


public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByJoinCode(String joinCode);


    /**
     * Find all active sessions (not ended or expired)
     */
    @Query("SELECT s FROM Session s WHERE s.status != 'ended' AND s.status != 'expired'")
    List<Session> findActiveSessions();

    /**
     * Find OFFLINE/EVENT sessions past their voting deadline that are still in voting status
     */
    @Query("SELECT s FROM Session s WHERE s.sessionType IN ('OFFLINE', 'EVENT') AND s.status = 'voting' AND s.votingDeadline < :now")
    List<Session> findPastDeadlineOfflineSessions(@Param("now") Instant now);
}
