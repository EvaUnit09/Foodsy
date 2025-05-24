package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.SessionRestaurant;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;


public interface SessionRestaurantRepository extends JpaRepository<SessionRestaurant, Long> {
    List<SessionRestaurant> findBySessionId(Long sessionId);

}
