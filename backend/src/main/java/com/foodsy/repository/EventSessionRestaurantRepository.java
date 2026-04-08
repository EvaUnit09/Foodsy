package com.foodsy.repository;

import com.foodsy.domain.EventSessionRestaurant;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface EventSessionRestaurantRepository extends JpaRepository<EventSessionRestaurant, Long> {
    List<EventSessionRestaurant> findBySessionIdOrderByDisplayOrder(Long sessionId);
    Optional<EventSessionRestaurant> findBySessionIdAndProviderId(Long sessionId, String providerId);
    int countBySessionId(Long sessionId);
    void deleteBySessionIdAndProviderId(Long sessionId, String providerId);
}
