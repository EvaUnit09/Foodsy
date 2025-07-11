package com.foodsy.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import java.time.Instant;

@Entity
@Table(name = "homepage_analytics",
       indexes = {
           @Index(name = "idx_user_id", columnList = "user_id"),
           @Index(name = "idx_event_type", columnList = "event_type"),
           @Index(name = "idx_section", columnList = "section"),
           @Index(name = "idx_created_at", columnList = "created_at"),
           @Index(name = "idx_place_id", columnList = "restaurant_place_id")
       })
public class HomepageAnalytics {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // Can be null for anonymous users
    
    @Column(name = "event_type", nullable = false, length = 50)
    @NotBlank
    private String eventType; // card_click, start_session, taste_profile_complete, section_view
    
    @Column(name = "section", length = 50)
    private String section; // hero, your_picks, highlights, trending, spotlight
    
    @Column(name = "restaurant_place_id")
    private String restaurantPlaceId; // Google Places place_id when applicable
    
    @Column(name = "session_id")
    private String sessionId; // Browser session ID for anonymous tracking
    
    @Column(name = "additional_data", columnDefinition = "TEXT")
    private String additionalData; // JSON string for extra context
    
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
    
    // Constructors
    public HomepageAnalytics() {}
    
    public HomepageAnalytics(String eventType, String section) {
        this.eventType = eventType;
        this.section = section;
    }
    
    public HomepageAnalytics(User user, String eventType, String section) {
        this.user = user;
        this.eventType = eventType;
        this.section = section;
    }
    
    public HomepageAnalytics(User user, String eventType, String section, String restaurantPlaceId) {
        this.user = user;
        this.eventType = eventType;
        this.section = section;
        this.restaurantPlaceId = restaurantPlaceId;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
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
    
    public Instant getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
    
    // Helper methods for common event types
    public static HomepageAnalytics cardClick(User user, String section, String placeId) {
        return new HomepageAnalytics(user, "card_click", section, placeId);
    }
    
    public static HomepageAnalytics startSession(User user) {
        return new HomepageAnalytics(user, "start_session", "hero");
    }
    
    public static HomepageAnalytics tasteProfileComplete(User user) {
        return new HomepageAnalytics(user, "taste_profile_complete", "onboarding");
    }
    
    public static HomepageAnalytics sectionView(User user, String section) {
        return new HomepageAnalytics(user, "section_view", section);
    }
    
    public static HomepageAnalytics joinCodeEntered(User user) {
        return new HomepageAnalytics(user, "join_code_entered", "hero");
    }
    
    // Anonymous user tracking
    public static HomepageAnalytics anonymousCardClick(String sessionId, String section, String placeId) {
        HomepageAnalytics analytics = new HomepageAnalytics(null, "card_click", section, placeId);
        analytics.setSessionId(sessionId);
        return analytics;
    }
    
    public static HomepageAnalytics anonymousSectionView(String sessionId, String section) {
        HomepageAnalytics analytics = new HomepageAnalytics(null, "section_view", section);
        analytics.setSessionId(sessionId);
        return analytics;
    }
} 