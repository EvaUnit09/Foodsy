package com.foodsy.repository;

import com.foodsy.domain.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByJoinCode(String joinCode);
}
