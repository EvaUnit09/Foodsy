package com.foodsy.repository;

import com.foodsy.domain.UserWatchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface UserWatchlistRepository extends JpaRepository<UserWatchlist, Long> {

    /**
 * Retrieve the watchlist entries for the specified user ordered by newest first.
 *
 * @param userId the ID of the user whose watchlist entries to retrieve
 * @return a list of UserWatchlist entries for the user ordered by `addedAt` descending; an empty list if none exist
 */
List<UserWatchlist> findByUserIdOrderByAddedAtDesc(Long userId);

    /**
 * Checks whether a watchlist entry exists for the specified user and place.
 *
 * @return `true` if a matching UserWatchlist exists, `false` otherwise.
 */
boolean existsByUserIdAndPlaceId(Long userId, String placeId);

    /**
     * Delete the watchlist entry for a given user and place.
     *
     * @param userId the ID of the user whose watchlist entry should be removed
     * @param placeId the place identifier of the watchlist entry to remove
     */
    @Transactional
    void deleteByUserIdAndPlaceId(Long userId, String placeId);
}
