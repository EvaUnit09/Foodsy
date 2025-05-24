package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.Session;
import org.springframework.data.jpa.repository.JpaRepository;


public interface SessionRepository extends JpaRepository<Session, Long> {
}
