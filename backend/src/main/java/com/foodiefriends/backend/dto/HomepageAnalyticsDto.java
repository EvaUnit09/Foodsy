package com.foodiefriends.backend.dto;

import com.foodiefriends.backend.domain.HomepageAnalytics;
import jakarta.validation.constraints.NotBlank;

import java.time.Instant;

public class HomepageAnalyticsDto {
    
    @NotBlank(message = "Event type is required")
    private String eventType;
    
    private String section;
    private String restaurantPlaceId;
    private String sessionId; // For anonymous tracking
    private String additionalData; // JSON string for extra context
    private Instant timestamp;
    
    // Constructors
    public HomepageAnalyticsDto() {}
    
    public HomepageAnalyticsDto(String eventType, String section) {
        this.eventType = eventType;
        this.section = section;
        this.timestamp = Instant.now();
    }
    
    public HomepageAnalyticsDto(String eventType, String section, String restaurantPlaceId) {
        this.eventType = eventType;
        this.section = section;
        this.restaurantPlaceId = restaurantPlaceId;
        this.timestamp = Instant.now();
    }
    
    // Factory method to create from entity
    public static HomepageAnalyticsDto fromEntity(HomepageAnalytics entity) {
        HomepageAnalyticsDto dto = new HomepageAnalyticsDto();
        dto.setEventType(entity.getEventType());
        dto.setSection(entity.getSection());
        dto.setRestaurantPlaceId(entity.getRestaurantPlaceId());
        dto.setSessionId(entity.getSessionId());
        dto.setAdditionalData(entity.getAdditionalData());
        dto.setTimestamp(entity.getCreatedAt());
        return dto;
    }
    
    // Getters and Setters
    public String getEventType() {
        return eventType;
    }
    
    public void setEventType(String eventType) {
        this.eventType = eventType;
    }
    
    public String getSection() {
        return section;
    }
    
    public void setSection(String section) {
        this.section = section;
    }
    
    public String getRestaurantPlaceId() {
        return restaurantPlaceId;
    }
    
    public void setRestaurantPlaceId(String restaurantPlaceId) {
        this.restaurantPlaceId = restaurantPlaceId;
    }
    
    public String getSessionId() {
        return sessionId;
    }
    
    public void setSessionId(String sessionId) {
        this.sessionId = sessionId;
    }
    
    public String getAdditionalData() {
        return additionalData;
    }
    
    public void setAdditionalData(String additionalData) {
        this.additionalData = additionalData;
    }
    
    public Instant getTimestamp() {
        return timestamp;
    }
    
    public void setTimestamp(Instant timestamp) {
        this.timestamp = timestamp;
    }
    
    // Helper methods for common event types
    public static HomepageAnalyticsDto cardClick(String section, String placeId) {
        return new HomepageAnalyticsDto("card_click", section, placeId);
    }
    
    public static HomepageAnalyticsDto startSession() {
        return new HomepageAnalyticsDto("start_session", "hero");
    }
    
    public static HomepageAnalyticsDto tasteProfileComplete() {
        return new HomepageAnalyticsDto("taste_profile_complete", "onboarding");
    }
    
    public static HomepageAnalyticsDto sectionView(String section) {
        return new HomepageAnalyticsDto("section_view", section);
    }
    
    public static HomepageAnalyticsDto joinCodeEntered() {
        return new HomepageAnalyticsDto("join_code_entered", "hero");
    }
    
    public static HomepageAnalyticsDto anonymousCardClick(String sessionId, String section, String placeId) {
        HomepageAnalyticsDto dto = new HomepageAnalyticsDto("card_click", section, placeId);
        dto.setSessionId(sessionId);
        return dto;
    }
    
    public static HomepageAnalyticsDto anonymousSectionView(String sessionId, String section) {
        HomepageAnalyticsDto dto = new HomepageAnalyticsDto("section_view", section);
        dto.setSessionId(sessionId);
        return dto;
    }
    
    // Validation methods
    public boolean isValid() {
        return eventType != null && !eventType.trim().isEmpty();
    }
    
    public boolean isCardClickEvent() {
        return "card_click".equals(eventType);
    }
    
    public boolean isSessionEvent() {
        return "start_session".equals(eventType) || "join_code_entered".equals(eventType);
    }
    
    public boolean isOnboardingEvent() {
        return "taste_profile_complete".equals(eventType);
    }
    
    public boolean isAnonymous() {
        return sessionId != null && !sessionId.trim().isEmpty();
    }
} 