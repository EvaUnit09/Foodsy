package com.foodiefriends.backend.dto;

import com.foodiefriends.backend.domain.RestaurantCache;

import java.util.List;

public class RestaurantSummaryDto {
    
    private String placeId;
    private String name;
    private String category;
    private Double rating;
    private Integer priceLevel;
    private String priceRange;
    private String address;
    private String borough;
    private String neighborhood;
    private List<String> photoReferences;
    private Integer userRatingCount;
    private String generativeSummary;
    private String reviewSummary;
    private String openingHours;
    private Double latitude;
    private Double longitude;
    
    // For analytics and recommendations
    private Integer clickCount; // Number of times clicked in last 7 days
    private Double popularityScore; // Calculated based on clicks, rating, etc.
    
    // Constructors
    public RestaurantSummaryDto() {}
    
    public RestaurantSummaryDto(String placeId, String name, String category) {
        this.placeId = placeId;
        this.name = name;
        this.category = category;
    }
    
    // Factory method to create from RestaurantCache entity
    public static RestaurantSummaryDto fromEntity(RestaurantCache entity) {
        RestaurantSummaryDto dto = new RestaurantSummaryDto();
        dto.setPlaceId(entity.getPlaceId());
        dto.setName(entity.getName());
        dto.setCategory(entity.getCategory());
        dto.setRating(entity.getRating());
        dto.setPriceLevel(entity.getPriceLevel());
        dto.setPriceRange(entity.getPriceRangeString());
        dto.setAddress(entity.getAddress());
        dto.setBorough(entity.getBorough());
        dto.setNeighborhood(entity.getNeighborhood());
        dto.setPhotoReferences(entity.getPhotoReferences());
        dto.setUserRatingCount(entity.getUserRatingCount());
        dto.setGenerativeSummary(entity.getGenerativeSummary());
        dto.setReviewSummary(entity.getReviewSummary());
        dto.setOpeningHours(entity.getOpeningHours());
        dto.setLatitude(entity.getLatitude());
        dto.setLongitude(entity.getLongitude());
        return dto;
    }
    
    // Factory method with analytics data
    public static RestaurantSummaryDto fromEntityWithAnalytics(RestaurantCache entity, Integer clickCount, Double popularityScore) {
        RestaurantSummaryDto dto = fromEntity(entity);
        dto.setClickCount(clickCount);
        dto.setPopularityScore(popularityScore);
        return dto;
    }
    
    // Getters and Setters
    public String getPlaceId() {
        return placeId;
    }
    
    public void setPlaceId(String placeId) {
        this.placeId = placeId;
    }
    
    public String getName() {
        return name;
    }
    
    public void setName(String name) {
        this.name = name;
    }
    
    public String getCategory() {
        return category;
    }
    
    public void setCategory(String category) {
        this.category = category;
    }
    
    public Double getRating() {
        return rating;
    }
    
    public void setRating(Double rating) {
        this.rating = rating;
    }
    
    public Integer getPriceLevel() {
        return priceLevel;
    }
    
    public void setPriceLevel(Integer priceLevel) {
        this.priceLevel = priceLevel;
    }
    
    public String getPriceRange() {
        return priceRange;
    }
    
    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public String getBorough() {
        return borough;
    }
    
    public void setBorough(String borough) {
        this.borough = borough;
    }
    
    public String getNeighborhood() {
        return neighborhood;
    }
    
    public void setNeighborhood(String neighborhood) {
        this.neighborhood = neighborhood;
    }
    
    public List<String> getPhotoReferences() {
        return photoReferences;
    }
    
    public void setPhotoReferences(List<String> photoReferences) {
        this.photoReferences = photoReferences;
    }
    
    public Integer getUserRatingCount() {
        return userRatingCount;
    }
    
    public void setUserRatingCount(Integer userRatingCount) {
        this.userRatingCount = userRatingCount;
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
    
    public String getOpeningHours() {
        return openingHours;
    }
    
    public void setOpeningHours(String openingHours) {
        this.openingHours = openingHours;
    }
    
    public Double getLatitude() {
        return latitude;
    }
    
    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }
    
    public Double getLongitude() {
        return longitude;
    }
    
    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }
    
    public Integer getClickCount() {
        return clickCount;
    }
    
    public void setClickCount(Integer clickCount) {
        this.clickCount = clickCount;
    }
    
    public Double getPopularityScore() {
        return popularityScore;
    }
    
    public void setPopularityScore(Double popularityScore) {
        this.popularityScore = popularityScore;
    }
    
    // Helper methods
    public boolean hasPhotos() {
        return photoReferences != null && !photoReferences.isEmpty();
    }
    
    public String getPrimaryPhotoReference() {
        return hasPhotos() ? photoReferences.get(0) : null;
    }
    
    public boolean isHighlyRated() {
        return rating != null && rating >= 4.0;
    }
    
    public boolean isPopular() {
        return clickCount != null && clickCount > 5; // Arbitrary threshold
    }
    
    public String getDisplayRating() {
        if (rating == null) return "No rating";
        return String.format("%.1f", rating);
    }
    
    public String getShortSummary() {
        if (generativeSummary != null && generativeSummary.length() > 100) {
            return generativeSummary.substring(0, 97) + "...";
        }
        return generativeSummary;
    }
} 