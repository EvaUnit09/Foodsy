package com.foodiefriends.backend.domain;

import jakarta.persistence.*;

@Entity
public class SessionRestaurant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Lob
    private Long sessionId; // FK to Session
    private String providerId; //Google Places place_id
    private String name;
    private String address;
    private String category;

    private Integer likeCount = 0;
    private Integer round = 1;

    // New fields for restaurant details
    private String priceLevel;
    private String priceRange;
    private Double rating;
    private Integer userRatingCount;

    @Column(columnDefinition = "TEXT")
    private String currentOpeningHours;
    @Column(columnDefinition = "TEXT")
    private String generativeSummary;
    @Column(columnDefinition = "TEXT")
    private String reviewSummary;

    public SessionRestaurant() {

    }

    public Long getSessionId() {
        return sessionId;
    }
    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }
    public String getProviderId() {
        return providerId;
    }
    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public String getAddress() {
        return address;
    }
    public void setAddress(String address) {
        this.address = address;
    }
    public String getCategory() {
        return category;
    }
    public void setCategory(String category) {
        this.category = category;
    }
    public Integer getLikeCount() {
        return likeCount;
    }
    public void setLikeCount(Integer likeCount) {
        this.likeCount = likeCount;
    }
    public Integer getRound() {
        return round;
    }
    public void setRound(Integer round) {
        this.round = round;
    }

    // New getters and setters
    public String getPriceLevel() {
        return priceLevel;
    }
    public void setPriceLevel(String priceLevel) {
        this.priceLevel = priceLevel;
    }

    public String getPriceRange() {
        return priceRange;
    }
    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }

    public Double getRating() {
        return rating;
    }
    public void setRating(Double rating) {
        this.rating = rating;
    }

    public Integer getUserRatingCount() {
        return userRatingCount;
    }
    public void setUserRatingCount(Integer userRatingCount) {
        this.userRatingCount = userRatingCount;
    }

    public String getCurrentOpeningHours() {
        return currentOpeningHours;
    }
    public void setCurrentOpeningHours(String currentOpeningHours) {
        this.currentOpeningHours = currentOpeningHours;
    }

    public String getGenerativeSummary() {
        return generativeSummary;
    }
    public void setGenerativeSummary(String generativeSummary) {
        this.generativeSummary = generativeSummary;
    }

    public String getReviewSummary() {
        return reviewSummary;
    }
    public void setReviewSummary(String reviewSummary) {
        this.reviewSummary = reviewSummary;
    }

    public Long getId() {
        return id;
    }

}
