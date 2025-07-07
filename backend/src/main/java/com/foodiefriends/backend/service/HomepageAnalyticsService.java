package com.foodiefriends.backend.service;

import com.foodiefriends.backend.domain.HomepageAnalytics;
import com.foodiefriends.backend.domain.User;
import com.foodiefriends.backend.dto.HomepageAnalyticsDto;
import com.foodiefriends.backend.repository.HomepageAnalyticsRepository;
import com.foodiefriends.backend.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
public class HomepageAnalyticsService {

    private static final Logger logger = LoggerFactory.getLogger(HomepageAnalyticsService.class);

    @Autowired
    private HomepageAnalyticsRepository analyticsRepository;

    @Autowired
    private UserRepository userRepository;

    /**
     * Track a homepage event for a logged-in user
     */
    @Transactional
    public void trackEvent(Long userId, HomepageAnalyticsDto eventDto) {
        try {
            User user = userRepository.findById(userId).orElse(null);
            
            HomepageAnalytics analytics = new HomepageAnalytics(
                user,
                eventDto.getEventType(),
                eventDto.getSection(),
                eventDto.getRestaurantPlaceId()
            );
            
            if (eventDto.getAdditionalData() != null) {
                analytics.setAdditionalData(eventDto.getAdditionalData());
            }
            
            analyticsRepository.save(analytics);
            
            logger.debug("Tracked event: {} for user: {} in section: {}", 
                        eventDto.getEventType(), userId, eventDto.getSection());
                        
        } catch (Exception e) {
            logger.error("Error tracking event for user {}: {}", userId, e.getMessage());
        }
    }

    /**
     * Track a homepage event for an anonymous user (using session ID)
     */
    @Transactional
    public void trackAnonymousEvent(String sessionId, HomepageAnalyticsDto eventDto) {
        try {
            HomepageAnalytics analytics = new HomepageAnalytics(
                null, // No user for anonymous events
                eventDto.getEventType(),
                eventDto.getSection(),
                eventDto.getRestaurantPlaceId()
            );
            
            analytics.setSessionId(sessionId);
            
            if (eventDto.getAdditionalData() != null) {
                analytics.setAdditionalData(eventDto.getAdditionalData());
            }
            
            analyticsRepository.save(analytics);
            
            logger.debug("Tracked anonymous event: {} for session: {} in section: {}", 
                        eventDto.getEventType(), sessionId, eventDto.getSection());
                        
        } catch (Exception e) {
            logger.error("Error tracking anonymous event for session {}: {}", sessionId, e.getMessage());
        }
    }

    /**
     * Track restaurant card click
     */
    public void trackRestaurantCardClick(Long userId, String section, String restaurantPlaceId) {
        HomepageAnalyticsDto event = HomepageAnalyticsDto.cardClick(section, restaurantPlaceId);
        if (userId != null) {
            trackEvent(userId, event);
        }
    }

    /**
     * Track restaurant card click for anonymous user
     */
    public void trackAnonymousRestaurantCardClick(String sessionId, String section, String restaurantPlaceId) {
        HomepageAnalyticsDto event = HomepageAnalyticsDto.anonymousCardClick(sessionId, section, restaurantPlaceId);
        trackAnonymousEvent(sessionId, event);
    }

    /**
     * Track session start from homepage
     */
    public void trackSessionStart(Long userId) {
        HomepageAnalyticsDto event = HomepageAnalyticsDto.startSession();
        trackEvent(userId, event);
    }

    /**
     * Track taste profile completion
     */
    public void trackTasteProfileCompletion(Long userId) {
        HomepageAnalyticsDto event = HomepageAnalyticsDto.tasteProfileComplete();
        trackEvent(userId, event);
    }

    /**
     * Track section view (when user scrolls to or interacts with a section)
     */
    public void trackSectionView(Long userId, String section) {
        HomepageAnalyticsDto event = HomepageAnalyticsDto.sectionView(section);
        if (userId != null) {
            trackEvent(userId, event);
        }
    }

    /**
     * Track section view for anonymous user
     */
    public void trackAnonymousSectionView(String sessionId, String section) {
        HomepageAnalyticsDto event = HomepageAnalyticsDto.anonymousSectionView(sessionId, section);
        trackAnonymousEvent(sessionId, event);
    }

    /**
     * Get analytics summary for the last N days
     */
    public AnalyticsSummary getAnalyticsSummary(int days) {
        logger.debug("Getting analytics summary for last {} days", days);
        
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        
        // Get basic counts
        List<Object[]> eventTypeCounts = analyticsRepository.countByEventType();
        List<Object[]> sectionCounts = analyticsRepository.countBySection();
        List<Object[]> cardClicksBySection = analyticsRepository.countCardClicksBySection(since);
        List<Object[]> mostClickedRestaurants = analyticsRepository.findMostClickedRestaurants(since);
        List<Object[]> dailyActiveUsers = analyticsRepository.countDailyActiveUsers(since);
        
        // Calculate conversion metrics
        Long sessionStarts = analyticsRepository.countSessionStarts(since);
        Double conversionRate = analyticsRepository.calculateConversionRate(since);
        
        // Get user engagement data
        List<Object[]> userEngagement = analyticsRepository.findUserEngagementScores(since);
        List<Object[]> anonymousActivity = analyticsRepository.findAnonymousSessionActivity(since);
        
        return new AnalyticsSummary(
            eventTypeCounts,
            sectionCounts,
            cardClicksBySection,
            mostClickedRestaurants,
            dailyActiveUsers,
            sessionStarts != null ? sessionStarts : 0L,
            conversionRate != null ? conversionRate : 0.0,
            userEngagement,
            anonymousActivity
        );
    }

    /**
     * Get popular sections ordered by user engagement
     */
    public List<Object[]> getPopularSections(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        return analyticsRepository.findPopularSectionsByUniqueUsers(since);
    }

    /**
     * Get most clicked restaurants in a time period
     */
    public List<Object[]> getMostClickedRestaurants(int days, int limit) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        List<Object[]> results = analyticsRepository.findMostClickedRestaurants(since);
        return results.stream().limit(limit).toList();
    }

    /**
     * Get user journey for a specific user
     */
    public List<HomepageAnalyticsDto> getUserJourney(Long userId, int days) {
        Instant endDate = Instant.now();
        Instant startDate = endDate.minus(days, ChronoUnit.DAYS);
        
        User user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            return List.of();
        }
        
        List<HomepageAnalytics> journey = analyticsRepository.findUserJourney(user, startDate, endDate);
        return journey.stream()
            .map(HomepageAnalyticsDto::fromEntity)
            .toList();
    }

    /**
     * Get hourly activity distribution
     */
    public Map<Integer, Long> getHourlyActivityDistribution(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        List<Object[]> hourlyData = analyticsRepository.findHourlyActivityDistribution(since);
        
        Map<Integer, Long> distribution = new HashMap<>();
        for (Object[] row : hourlyData) {
            Integer hour = ((Number) row[0]).intValue();
            Long count = ((Number) row[1]).longValue();
            distribution.put(hour, count);
        }
        
        // Fill in missing hours with 0
        for (int hour = 0; hour < 24; hour++) {
            distribution.putIfAbsent(hour, 0L);
        }
        
        return distribution;
    }

    /**
     * Get conversion funnel metrics
     */
    public ConversionFunnel getConversionFunnel(int days) {
        Instant since = Instant.now().minus(days, ChronoUnit.DAYS);
        
        // Count events at each step of the funnel
        long homepageViews = analyticsRepository.findByEventTypeAndDateRange("section_view", since, Instant.now()).size();
        long tasteProfileStarts = analyticsRepository.findByEventTypeAndDateRange("section_view", since, Instant.now())
            .stream()
            .filter(event -> "onboarding".equals(event.getSection()))
            .count();
        long tasteProfileCompletions = analyticsRepository.findByEventTypeAndDateRange("taste_profile_complete", since, Instant.now()).size();
        long sessionStarts = analyticsRepository.findByEventTypeAndDateRange("start_session", since, Instant.now()).size();
        
        return new ConversionFunnel(
            homepageViews,
            tasteProfileStarts,
            tasteProfileCompletions,
            sessionStarts
        );
    }

    /**
     * Clean up old analytics data (beyond retention period)
     */
    @Transactional
    public int cleanupOldAnalytics(int retentionDays) {
        logger.info("Cleaning up analytics data older than {} days", retentionDays);
        
        Instant retentionDate = Instant.now().minus(retentionDays, ChronoUnit.DAYS);
        int deletedCount = analyticsRepository.deleteOldAnalytics(retentionDate);
        
        logger.info("Deleted {} old analytics records", deletedCount);
        return deletedCount;
    }

    /**
     * Get real-time analytics for dashboard
     */
    public RealTimeAnalytics getRealTimeAnalytics() {
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        Instant oneDayAgo = Instant.now().minus(1, ChronoUnit.DAYS);
        
        // Count events in the last hour
        List<HomepageAnalytics> lastHourEvents = analyticsRepository.findByEventTypeAndDateRange(
            null, oneHourAgo, Instant.now());
        
        // Count unique users in the last hour
        long activeUsersLastHour = lastHourEvents.stream()
            .filter(event -> event.getUser() != null)
            .mapToLong(event -> event.getUser().getId())
            .distinct()
            .count();
        
        // Count events in the last day
        List<HomepageAnalytics> lastDayEvents = analyticsRepository.findByEventTypeAndDateRange(
            null, oneDayAgo, Instant.now());
        
        return new RealTimeAnalytics(
            lastHourEvents.size(),
            activeUsersLastHour,
            lastDayEvents.size(),
            getMostRecentEvents(10)
        );
    }

    /**
     * Get most recent events for real-time monitoring
     */
    public List<HomepageAnalyticsDto> getMostRecentEvents(int limit) {
        Instant oneHourAgo = Instant.now().minus(1, ChronoUnit.HOURS);
        
        List<HomepageAnalytics> recentEvents = analyticsRepository.findByEventTypeAndDateRange(
            null, oneHourAgo, Instant.now());
        
        return recentEvents.stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .limit(limit)
            .map(HomepageAnalyticsDto::fromEntity)
            .toList();
    }

    // Helper classes for analytics responses
    public record AnalyticsSummary(
        List<Object[]> eventTypeCounts,
        List<Object[]> sectionCounts,
        List<Object[]> cardClicksBySection,
        List<Object[]> mostClickedRestaurants,
        List<Object[]> dailyActiveUsers,
        Long sessionStarts,
        Double conversionRate,
        List<Object[]> userEngagement,
        List<Object[]> anonymousActivity
    ) {}

    public record ConversionFunnel(
        long homepageViews,
        long tasteProfileStarts,
        long tasteProfileCompletions,
        long sessionStarts
    ) {
        public double getTasteProfileStartRate() {
            return homepageViews > 0 ? (double) tasteProfileStarts / homepageViews : 0.0;
        }
        
        public double getTasteProfileCompletionRate() {
            return tasteProfileStarts > 0 ? (double) tasteProfileCompletions / tasteProfileStarts : 0.0;
        }
        
        public double getSessionStartRate() {
            return tasteProfileCompletions > 0 ? (double) sessionStarts / tasteProfileCompletions : 0.0;
        }
        
        public double getOverallConversionRate() {
            return homepageViews > 0 ? (double) sessionStarts / homepageViews : 0.0;
        }
    }

    public record RealTimeAnalytics(
        int eventsLastHour,
        long activeUsersLastHour,
        int eventsLastDay,
        List<HomepageAnalyticsDto> recentEvents
    ) {}
} 