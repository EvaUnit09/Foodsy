package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.SessionRestaurant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;


public interface SessionRestaurantRepository extends JpaRepository<SessionRestaurant, Long> {
    List<SessionRestaurant> findBySessionId(Long sessionId);
    Optional<SessionRestaurant> findBySessionIdAndProviderId(Long sessionId, String providerId);


}
