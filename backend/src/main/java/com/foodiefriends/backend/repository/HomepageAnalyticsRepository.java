package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.HomepageAnalytics;
import com.foodiefriends.backend.domain.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;

@Repository
public interface HomepageAnalyticsRepository extends JpaRepository<HomepageAnalytics, Long> {
    
    /**
     * Find analytics events by user
     */
    List<HomepageAnalytics> findByUser(User user);
    
    /**
     * Find analytics events by user and date range
     */
    @Query("SELECT h FROM HomepageAnalytics h WHERE h.user = :user AND h.createdAt BETWEEN :startDate AND :endDate ORDER BY h.createdAt DESC")
    List<HomepageAnalytics> findByUserAndDateRange(@Param("user") User user, @Param("startDate") Instant startDate, @Param("endDate") Instant endDate);
    
    /**
     * Count events by type
     */
    @Query("SELECT h.eventType, COUNT(h) FROM HomepageAnalytics h GROUP BY h.eventType")
    List<Object[]> countByEventType();
    
    /**
     * Count events by section
     */
    @Query("SELECT h.section, COUNT(h) FROM HomepageAnalytics h WHERE h.section IS NOT NULL GROUP BY h.section")
    List<Object[]> countBySection();
    
    /**
     * Count card clicks by section in the last 7 days
     */
    @Query("SELECT h.section, COUNT(h) FROM HomepageAnalytics h WHERE h.eventType = 'card_click' AND h.createdAt >= :since GROUP BY h.section ORDER BY COUNT(h) DESC")
    List<Object[]> countCardClicksBySection(@Param("since") Instant since);
    
    /**
     * Find most clicked restaurants in the last 7 days
     */
    @Query("SELECT h.restaurantPlaceId, COUNT(h) FROM HomepageAnalytics h WHERE h.eventType = 'card_click' AND h.restaurantPlaceId IS NOT NULL AND h.createdAt >= :since GROUP BY h.restaurantPlaceId ORDER BY COUNT(h) DESC")
    List<Object[]> findMostClickedRestaurants(@Param("since") Instant since);
    
    /**
     * Count taste profile completions by date
     */
    @Query("SELECT DATE(h.createdAt), COUNT(h) FROM HomepageAnalytics h WHERE h.eventType = 'taste_profile_complete' AND h.createdAt >= :since GROUP BY DATE(h.createdAt) ORDER BY DATE(h.createdAt)")
    List<Object[]> countTasteProfileCompletionsByDate(@Param("since") Instant since);
    
    /**
     * Count session creations from homepage
     */
    @Query("SELECT COUNT(h) FROM HomepageAnalytics h WHERE h.eventType = 'start_session' AND h.createdAt >= :since")
    Long countSessionStarts(@Param("since") Instant since);
    
    /**
     * Find conversion rate: taste_profile_complete to start_session
     */
    @Query("SELECT " +
           "(SELECT COUNT(h1) FROM HomepageAnalytics h1 WHERE h1.eventType = 'start_session' AND h1.createdAt >= :since) * 1.0 / " +
           "(SELECT COUNT(h2) FROM HomepageAnalytics h2 WHERE h2.eventType = 'taste_profile_complete' AND h2.createdAt >= :since)")
    Double calculateConversionRate(@Param("since") Instant since);
    
    /**
     * Find daily active users (unique users with any event)
     */
    @Query("SELECT DATE(h.createdAt), COUNT(DISTINCT h.user) FROM HomepageAnalytics h WHERE h.user IS NOT NULL AND h.createdAt >= :since GROUP BY DATE(h.createdAt) ORDER BY DATE(h.createdAt)")
    List<Object[]> countDailyActiveUsers(@Param("since") Instant since);
    
    /**
     * Find popular sections by unique users
     */
    @Query("SELECT h.section, COUNT(DISTINCT h.user) FROM HomepageAnalytics h WHERE h.section IS NOT NULL AND h.createdAt >= :since GROUP BY h.section ORDER BY COUNT(DISTINCT h.user) DESC")
    List<Object[]> findPopularSectionsByUniqueUsers(@Param("since") Instant since);
    
    /**
     * Find user engagement score (events per user in time period)
     */
    @Query("SELECT h.user, COUNT(h) FROM HomepageAnalytics h WHERE h.user IS NOT NULL AND h.createdAt >= :since GROUP BY h.user ORDER BY COUNT(h) DESC")
    List<Object[]> findUserEngagementScores(@Param("since") Instant since);
    
    /**
     * Find anonymous session activity
     */
    @Query("SELECT h.sessionId, COUNT(h) FROM HomepageAnalytics h WHERE h.user IS NULL AND h.sessionId IS NOT NULL AND h.createdAt >= :since GROUP BY h.sessionId ORDER BY COUNT(h) DESC")
    List<Object[]> findAnonymousSessionActivity(@Param("since") Instant since);
    
    /**
     * Find events by type and date range
     */
    @Query("SELECT h FROM HomepageAnalytics h WHERE h.eventType = :eventType AND h.createdAt BETWEEN :startDate AND :endDate ORDER BY h.createdAt DESC")
    List<HomepageAnalytics> findByEventTypeAndDateRange(@Param("eventType") String eventType, @Param("startDate") Instant startDate, @Param("endDate") Instant endDate);
    
    /**
     * Find hourly activity distribution
     */
    @Query(value = "SELECT EXTRACT(hour FROM created_at) as hour, COUNT(*) FROM homepage_analytics WHERE created_at >= :since GROUP BY EXTRACT(hour FROM created_at) ORDER BY hour", nativeQuery = true)
    List<Object[]> findHourlyActivityDistribution(@Param("since") Instant since);
    
    /**
     * Clean up old analytics data (older than retention period)
     */
    @Query("DELETE FROM HomepageAnalytics h WHERE h.createdAt < :retentionDate")
    int deleteOldAnalytics(@Param("retentionDate") Instant retentionDate);
    
    /**
     * Find user journey events (ordered by user and time)
     */
    @Query("SELECT h FROM HomepageAnalytics h WHERE h.user = :user AND h.createdAt BETWEEN :startDate AND :endDate ORDER BY h.createdAt ASC")
    List<HomepageAnalytics> findUserJourney(@Param("user") User user, @Param("startDate") Instant startDate, @Param("endDate") Instant endDate);
} 