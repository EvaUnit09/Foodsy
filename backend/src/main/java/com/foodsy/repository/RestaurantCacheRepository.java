package com.foodsy.repository;

import com.foodsy.domain.RestaurantCache;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface RestaurantCacheRepository extends JpaRepository<RestaurantCache, Long> {
    
    /**
     * Find cached restaurant by Google Places place_id
     */
    Optional<RestaurantCache> findByPlaceId(String placeId);
    
    /**
     * Find non-expired restaurants by borough
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.borough = :borough AND r.expiresAt > :now ORDER BY r.rating DESC")
    List<RestaurantCache> findByBoroughNotExpired(@Param("borough") String borough, @Param("now") Instant now);
    
    /**
     * Find non-expired restaurants by borough with pagination
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.borough = :borough AND r.expiresAt > :now ORDER BY r.rating DESC")
    Page<RestaurantCache> findByBoroughNotExpired(@Param("borough") String borough, @Param("now") Instant now, Pageable pageable);
    
    /**
     * Find restaurants by price level and borough
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.borough = :borough AND r.priceLevel = :priceLevel AND r.expiresAt > :now ORDER BY r.rating DESC")
    List<RestaurantCache> findByBoroughAndPriceLevel(@Param("borough") String borough, @Param("priceLevel") Integer priceLevel, @Param("now") Instant now);
    
    /**
     * Find restaurants by category (cuisine type)
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.category ILIKE %:category% AND r.expiresAt > :now ORDER BY r.rating DESC")
    List<RestaurantCache> findByCategory(@Param("category") String category, @Param("now") Instant now);
    
    /**
     * Find restaurants by category and borough
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.category ILIKE %:category% AND r.borough = :borough AND r.expiresAt > :now ORDER BY r.rating DESC")
    List<RestaurantCache> findByCategoryAndBorough(@Param("category") String category, @Param("borough") String borough, @Param("now") Instant now);
    
    /**
     * Find top-rated restaurants in a borough
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.borough = :borough AND r.rating >= :minRating AND r.expiresAt > :now ORDER BY r.rating DESC, r.userRatingCount DESC")
    List<RestaurantCache> findTopRatedInBorough(@Param("borough") String borough, @Param("minRating") Double minRating, @Param("now") Instant now, Pageable pageable);
    
    /**
     * Find recently added restaurants (for trending section)
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.createdAt >= :since AND r.expiresAt > :now ORDER BY r.createdAt DESC")
    List<RestaurantCache> findRecentlyAdded(@Param("since") Instant since, @Param("now") Instant now, Pageable pageable);
    
    /**
     * Find expired restaurants for cleanup
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.expiresAt <= :now")
    List<RestaurantCache> findExpired(@Param("now") Instant now);
    
    /**
     * Delete expired restaurants
     */
    @Modifying
    @Transactional
    @Query("DELETE FROM RestaurantCache r WHERE r.expiresAt <= :now")
    int deleteExpired(@Param("now") Instant now);
    
    /**
     * Count restaurants by borough
     */
    @Query("SELECT r.borough, COUNT(r) FROM RestaurantCache r WHERE r.expiresAt > :now GROUP BY r.borough")
    List<Object[]> countByBorough(@Param("now") Instant now);
    
    /**
     * Find restaurants that need refresh (close to expiration)
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.expiresAt BETWEEN :now AND :refreshThreshold ORDER BY r.expiresAt ASC")
    List<RestaurantCache> findNeedingRefresh(@Param("now") Instant now, @Param("refreshThreshold") Instant refreshThreshold);
    
    /**
     * Check if place_id exists and is not expired
     */
    @Query("SELECT CASE WHEN COUNT(r) > 0 THEN true ELSE false END FROM RestaurantCache r WHERE r.placeId = :placeId AND r.expiresAt > :now")
    boolean existsByPlaceIdAndNotExpired(@Param("placeId") String placeId, @Param("now") Instant now);
    
    /**
     * Find random restaurants for spotlight section
     */
    @Query(value = "SELECT * FROM restaurant_cache WHERE borough = :borough AND expires_at > :now AND rating >= :minRating ORDER BY RANDOM() LIMIT :limit", nativeQuery = true)
    List<RestaurantCache> findRandomHighRated(@Param("borough") String borough, @Param("now") Instant now, @Param("minRating") Double minRating, @Param("limit") int limit);
    
    /**
     * Find restaurants with photos (for visual sections)
     */
    @Query("SELECT r FROM RestaurantCache r WHERE r.borough = :borough AND r.expiresAt > :now AND SIZE(r.photoReferences) > 0 ORDER BY r.rating DESC")
    List<RestaurantCache> findWithPhotosInBorough(@Param("borough") String borough, @Param("now") Instant now, Pageable pageable);
    
    /**
     * Update last fetched timestamp
     */
    @Modifying
    @Transactional
    @Query("UPDATE RestaurantCache r SET r.lastFetchedAt = :now, r.expiresAt = :expiresAt WHERE r.placeId = :placeId")
    int updateLastFetched(@Param("placeId") String placeId, @Param("now") Instant now, @Param("expiresAt") Instant expiresAt);
    
    /**
     * Find restaurants for multi-criteria search (homepage personalization)
     */
    @Query("SELECT r FROM RestaurantCache r WHERE " +
           "(:borough IS NULL OR r.borough = :borough) AND " +
           "(:priceLevel IS NULL OR r.priceLevel = :priceLevel) AND " +
           "(:category IS NULL OR r.category ILIKE %:category%) AND " +
           "r.expiresAt > :now AND r.rating >= :minRating " +
           "ORDER BY r.rating DESC, r.userRatingCount DESC")
    List<RestaurantCache> findByMultipleCriteria(
        @Param("borough") String borough,
        @Param("priceLevel") Integer priceLevel,
        @Param("category") String category,
        @Param("minRating") Double minRating,
        @Param("now") Instant now,
        Pageable pageable
    );
} 