package com.foodsy.repository;

import com.foodsy.domain.User;
import com.foodsy.domain.UserTastePreferences;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface UserTastePreferencesRepository extends JpaRepository<UserTastePreferences, Long> {
    
    /**
     * Find taste preferences for a specific user
     */
    Optional<UserTastePreferences> findByUser(User user);
    
    /**
     * Find taste preferences by user ID
     */
    @Query("SELECT u FROM UserTastePreferences u WHERE u.user.id = :userId")
    Optional<UserTastePreferences> findByUserId(@Param("userId") Long userId);
    
    /**
     * Check if user has completed taste profile onboarding
     */
    boolean existsByUser(User user);
    
    /**
     * Find users with similar taste preferences (same borough and overlapping cuisines)
     */
    @Query("SELECT u FROM UserTastePreferences u WHERE u.preferredBorough = :borough AND SIZE(u.preferredCuisines) > 0")
    List<UserTastePreferences> findUsersInBorough(@Param("borough") String borough);
    
    /**
     * Find users who prefer specific cuisines
     */
    @Query("SELECT u FROM UserTastePreferences u WHERE :cuisine MEMBER OF u.preferredCuisines")
    List<UserTastePreferences> findUsersByCuisine(@Param("cuisine") String cuisine);
    
    /**
     * Find users by price range preference
     */
    List<UserTastePreferences> findByPriceRange(String priceRange);
    
    /**
     * Get count of users by borough
     */
    @Query("SELECT u.preferredBorough, COUNT(u) FROM UserTastePreferences u GROUP BY u.preferredBorough")
    List<Object[]> countUsersByBorough();
    
    /**
     * Get count of users by price range
     */
    @Query("SELECT u.priceRange, COUNT(u) FROM UserTastePreferences u GROUP BY u.priceRange")
    List<Object[]> countUsersByPriceRange();
    
    /**
     * Find users who have vegan/vegetarian preferences
     */
    @Query("SELECT u FROM UserTastePreferences u WHERE 'Vegan' MEMBER OF u.preferredCuisines OR 'Vegetarian' MEMBER OF u.preferredCuisines")
    List<UserTastePreferences> findVeganVegetarianUsers();
    
    /**
     * Find users with multiple overlapping preferences (for recommendation engine)
     */
    @Query("SELECT u FROM UserTastePreferences u WHERE u.preferredBorough = :borough AND u.priceRange = :priceRange")
    List<UserTastePreferences> findSimilarUsers(@Param("borough") String borough, @Param("priceRange") String priceRange);
} 