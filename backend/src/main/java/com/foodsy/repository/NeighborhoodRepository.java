package com.foodsy.repository;

import com.foodsy.domain.Neighborhood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NeighborhoodRepository extends JpaRepository<Neighborhood, Long> {

    List<Neighborhood> findByBoroughIgnoreCaseOrderByDisplayOrder(String borough);

    Optional<Neighborhood> findByNameIgnoreCaseAndBoroughIgnoreCase(String name, String borough);
}
