package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.Session;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;


public interface SessionRepository extends JpaRepository<Session, Long> {
    Optional<Session> findByJoinCode(String joinCode);
}
