package com.foodsy.repository;

import com.foodsy.domain.EventRsvp;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventRsvpRepository extends JpaRepository<EventRsvp, Long> {
    List<EventRsvp> findBySessionId(Long sessionId);
    Optional<EventRsvp> findBySessionIdAndUserId(Long sessionId, String userId);
    int countBySessionId(Long sessionId);
}
