package com.foodsy.repository;

import com.foodsy.domain.UserFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    /**
 * Retrieve a user's favorites ordered by most recently added.
 *
 * @param userId ID of the user whose favorites to retrieve.
 * @return a list of UserFavorite for the given user ordered by `addedAt` descending; an empty list if none exist.
 */
List<UserFavorite> findByUserIdOrderByAddedAtDesc(Long userId);

    /**
 * Checks whether a favorite entry exists for the specified user and place.
 *
 * @param userId  the identifier of the user
 * @param placeId the identifier of the place
 * @return true if a UserFavorite exists for the given userId and placeId, false otherwise
 */
boolean existsByUserIdAndPlaceId(Long userId, String placeId);

    /**
     * Delete the user's favorite for the specified place.
     *
     * Removes the UserFavorite record that matches the given user ID and place ID.
     *
     * @param userId  the ID of the user whose favorite will be removed
     * @param placeId the identifier of the place to remove from the user's favorites
     */
    @Transactional
    void deleteByUserIdAndPlaceId(Long userId, String placeId);
}
