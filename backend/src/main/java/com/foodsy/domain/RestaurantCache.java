package com.foodsy.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

@Entity
@Table(name = "restaurant_cache", 
       indexes = {
           @Index(name = "idx_place_id", columnList = "place_id", unique = true),
           @Index(name = "idx_borough", columnList = "borough"),
           @Index(name = "idx_neighborhood", columnList = "neighborhood"),
           @Index(name = "idx_expires_at", columnList = "expires_at"),
           @Index(name = "idx_price_level", columnList = "price_level"),
           @Index(name = "idx_category", columnList = "category")
       })
public class RestaurantCache {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "place_id", unique = true, nullable = false)
    @NotBlank
    private String placeId;
    
    @Column(name = "name", nullable = false)
    @NotBlank
    private String name;
    
    @Column(name = "category")
    private String category;
    
    @Column(name = "rating")
    private Double rating;
    
    @Column(name = "price_level")
    private Integer priceLevel; // 1-3 for $-$$$
    
    @Column(name = "address", columnDefinition = "TEXT")
    private String address;
    
    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "restaurant_cache_photos", joinColumns = @JoinColumn(name = "restaurant_cache_id"))
    @Column(name = "photo_reference", columnDefinition = "TEXT")
    private List<String> photoReferences;
    
    @Column(name = "opening_hours", columnDefinition = "TEXT")
    private String openingHours; // JSON string from Places API
    
    @Column(name = "user_rating_count")
    private Integer userRatingCount;
    
    @Column(name = "generative_summary", columnDefinition = "TEXT")
    private String generativeSummary;
    
    @Column(name = "review_summary", columnDefinition = "TEXT")
    private String reviewSummary;
    
    @Column(name = "website_uri", columnDefinition = "TEXT")
    private String websiteUri;
    
    @Column(name = "borough", length = 50)
    private String borough; // Manhattan, Brooklyn, Queens, Bronx, Staten Island
    
    @Column(name = "neighborhood")
    private String neighborhood;
    
    @Column(name = "latitude")
    private Double latitude;
    
    @Column(name = "longitude")
    private Double longitude;
    
    @Column(name = "last_fetched_at")
    @NotNull
    private Instant lastFetchedAt = Instant.now();
    
    @Column(name = "expires_at")
    @NotNull
    private Instant expiresAt;
    
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
    
    @Column(name = "trending_score")
    private Double trendingScore = 0.0;
    
    @Column(name = "trending_rank")
    private Integer trendingRank;
    
    @Column(name = "last_trending_calc_at")
    private Instant lastTrendingCalcAt;
    
    // Constructors
    public RestaurantCache() {
        // Set expiration to 30 days from now (as per Places API terms)
        this.expiresAt = Instant.now().plusSeconds(30 * 24 * 60 * 60); // 30 days
    }
    
    public RestaurantCache(String placeId, String name) {
        this();
        this.placeId = placeId;
        this.name = name;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
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
    
    public String getAddress() {
        return address;
    }
    
    public void setAddress(String address) {
        this.address = address;
    }
    
    public List<String> getPhotoReferences() {
        return photoReferences;
    }
    
    public void setPhotoReferences(List<String> photoReferences) {
        this.photoReferences = photoReferences;
    }
    
    public String getOpeningHours() {
        return openingHours;
    }
    
    public void setOpeningHours(String openingHours) {
        this.openingHours = openingHours;
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
    
    public String getWebsiteUri() {
        return websiteUri;
    }
    
    public void setWebsiteUri(String websiteUri) {
        this.websiteUri = websiteUri;
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
    
    public Instant getLastFetchedAt() {
        return lastFetchedAt;
    }
    
    public void setLastFetchedAt(Instant lastFetchedAt) {
        this.lastFetchedAt = lastFetchedAt;
    }
    
    public Instant getExpiresAt() {
        return expiresAt;
    }
    
    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }
    
    public Instant getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
    
    // Helper methods
    public boolean isExpired() {
        return Instant.now().isAfter(expiresAt);
    }
    
    public void refreshExpiration() {
        this.lastFetchedAt = Instant.now();
        this.expiresAt = Instant.now().plusSeconds(30 * 24 * 60 * 60); // 30 days
    }
    
    public String getPriceRangeString() {
        if (priceLevel == null) return null;
        switch (priceLevel) {
            case 1: return "$";
            case 2: return "$$";
            case 3: return "$$$";
            default: return null;
        }
    }
    
    public long getDaysUntilExpiration() {
        return (expiresAt.getEpochSecond() - Instant.now().getEpochSecond()) / (24 * 60 * 60);
    }
    
    public Double getTrendingScore() {
        return trendingScore;
    }
    
    public void setTrendingScore(Double trendingScore) {
        this.trendingScore = trendingScore;
    }
    
    public Integer getTrendingRank() {
        return trendingRank;
    }
    
    public void setTrendingRank(Integer trendingRank) {
        this.trendingRank = trendingRank;
    }
    
    public Instant getLastTrendingCalcAt() {
        return lastTrendingCalcAt;
    }
    
    public void setLastTrendingCalcAt(Instant lastTrendingCalcAt) {
        this.lastTrendingCalcAt = lastTrendingCalcAt;
    }
} 