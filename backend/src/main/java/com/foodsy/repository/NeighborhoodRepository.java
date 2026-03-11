package com.foodsy.repository;

import com.foodsy.domain.Neighborhood;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface NeighborhoodRepository extends JpaRepository<Neighborhood, Long> {

    /**
 * Finds neighborhoods in the specified borough ordered by their display order.
 *
 * @param borough the borough to filter neighborhoods by
 * @return a list of Neighborhood entities belonging to the specified borough, ordered by `displayOrder`
 */
List<Neighborhood> findByBoroughOrderByDisplayOrder(String borough);

    /**
 * Finds a neighborhood matching the given name and borough using case-insensitive comparison.
 *
 * @param name    the neighborhood name to match (case-insensitive)
 * @param borough the borough name to match (case-insensitive)
 * @return an Optional containing the matching Neighborhood if present, or Optional.empty() otherwise
 */
Optional<Neighborhood> findByNameIgnoreCaseAndBoroughIgnoreCase(String name, String borough);
}
