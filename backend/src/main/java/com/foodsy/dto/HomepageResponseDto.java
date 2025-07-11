package com.foodsy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class HomepageResponseDto {
    
    // User context
    private boolean isAuthenticated;
    private String userName;
    private boolean hasTasteProfile;
    private TasteProfileDto tasteProfile;
    
    // Homepage sections
    private List<RestaurantSummaryDto> yourPicks;
    @JsonProperty("highlights")
    private List<RestaurantSummaryDto> neighborhoodHighlights;
    @JsonProperty("trending")
    private List<RestaurantSummaryDto> trendingNow;
    private List<RestaurantSummaryDto> spotlight;
    
    // Metadata
    private String primaryBorough; // User's preferred borough or default
    private Integer totalRestaurantsInCache;
    private boolean showOnboarding; // Should show taste profile onboarding
    private boolean hasOnboarded;   // Frontend flag (show onboarding inverse)
    
    // Performance info (for debugging/monitoring)
    private long responseTimeMs;
    private boolean usingCache;
    private String dataSource; // "cache" or "api" or "mixed"
    
    // Constructors
    public HomepageResponseDto() {}
    
    public HomepageResponseDto(boolean isAuthenticated, String userName) {
        this.isAuthenticated = isAuthenticated;
        this.userName = userName;
    }
    
    // Getters and Setters
    public boolean isAuthenticated() {
        return isAuthenticated;
    }
    
    public void setAuthenticated(boolean authenticated) {
        isAuthenticated = authenticated;
    }
    
    public String getUserName() {
        return userName;
    }
    
    public void setUserName(String userName) {
        this.userName = userName;
    }
    
    public boolean isHasTasteProfile() {
        return hasTasteProfile;
    }
    
    public void setHasTasteProfile(boolean hasTasteProfile) {
        this.hasTasteProfile = hasTasteProfile;
    }
    
    public TasteProfileDto getTasteProfile() {
        return tasteProfile;
    }
    
    public void setTasteProfile(TasteProfileDto tasteProfile) {
        this.tasteProfile = tasteProfile;
    }
    
    public List<RestaurantSummaryDto> getYourPicks() {
        return yourPicks;
    }
    
    public void setYourPicks(List<RestaurantSummaryDto> yourPicks) {
        this.yourPicks = yourPicks;
    }
    
    public List<RestaurantSummaryDto> getNeighborhoodHighlights() {
        return neighborhoodHighlights;
    }
    
    public void setNeighborhoodHighlights(List<RestaurantSummaryDto> neighborhoodHighlights) {
        this.neighborhoodHighlights = neighborhoodHighlights;
    }
    
    public List<RestaurantSummaryDto> getTrendingNow() {
        return trendingNow;
    }
    
    public void setTrendingNow(List<RestaurantSummaryDto> trendingNow) {
        this.trendingNow = trendingNow;
    }
    
    public List<RestaurantSummaryDto> getSpotlight() {
        return spotlight;
    }
    
    public void setSpotlight(List<RestaurantSummaryDto> spotlight) {
        this.spotlight = spotlight;
    }
    
    public String getPrimaryBorough() {
        return primaryBorough;
    }
    
    public void setPrimaryBorough(String primaryBorough) {
        this.primaryBorough = primaryBorough;
    }
    
    public Integer getTotalRestaurantsInCache() {
        return totalRestaurantsInCache;
    }
    
    public void setTotalRestaurantsInCache(Integer totalRestaurantsInCache) {
        this.totalRestaurantsInCache = totalRestaurantsInCache;
    }
    
    public boolean isShowOnboarding() {
        return showOnboarding;
    }
    
    public void setShowOnboarding(boolean showOnboarding) {
        this.showOnboarding = showOnboarding;
        this.hasOnboarded = !showOnboarding;
    }
    
    public boolean isHasOnboarded() {
        return hasOnboarded;
    }
    
    public void setHasOnboarded(boolean hasOnboarded) {
        this.hasOnboarded = hasOnboarded;
        this.showOnboarding = !hasOnboarded;
    }
    
    public long getResponseTimeMs() {
        return responseTimeMs;
    }
    
    public void setResponseTimeMs(long responseTimeMs) {
        this.responseTimeMs = responseTimeMs;
    }
    
    public boolean isUsingCache() {
        return usingCache;
    }
    
    public void setUsingCache(boolean usingCache) {
        this.usingCache = usingCache;
    }
    
    public String getDataSource() {
        return dataSource;
    }
    
    public void setDataSource(String dataSource) {
        this.dataSource = dataSource;
    }
    
    // Helper methods
    public int getTotalRestaurantCount() {
        int count = 0;
        if (yourPicks != null) count += yourPicks.size();
        if (neighborhoodHighlights != null) count += neighborhoodHighlights.size();
        if (trendingNow != null) count += trendingNow.size();
        if (spotlight != null) count += spotlight.size();
        return count;
    }
    
    public boolean hasAnyRestaurants() {
        return getTotalRestaurantCount() > 0;
    }
    
    public boolean needsOnboarding() {
        return isAuthenticated && !hasTasteProfile;
    }
    
    public String getGreeting() {
        if (!isAuthenticated) {
            return "Welcome to foodsy!";
        }
        if (userName != null) {
            return "Welcome back, " + userName + "!";
        }
        return "Welcome back!";
    }
    
    // Builder pattern for easier construction
    public static class Builder {
        private HomepageResponseDto response = new HomepageResponseDto();
        
        public Builder authenticated(boolean authenticated, String userName) {
            response.setAuthenticated(authenticated);
            response.setUserName(userName);
            return this;
        }
        
        public Builder tasteProfile(TasteProfileDto tasteProfile) {
            response.setTasteProfile(tasteProfile);
            response.setHasTasteProfile(tasteProfile != null);
            if (tasteProfile != null) {
                response.setPrimaryBorough(tasteProfile.getPreferredBorough());
            }
            return this;
        }
        
        public Builder yourPicks(List<RestaurantSummaryDto> restaurants) {
            response.setYourPicks(restaurants);
            return this;
        }
        
        public Builder neighborhoodHighlights(List<RestaurantSummaryDto> restaurants) {
            response.setNeighborhoodHighlights(restaurants);
            return this;
        }
        
        public Builder trendingNow(List<RestaurantSummaryDto> restaurants) {
            response.setTrendingNow(restaurants);
            return this;
        }
        
        public Builder spotlight(List<RestaurantSummaryDto> restaurants) {
            response.setSpotlight(restaurants);
            return this;
        }
        
        public Builder metadata(String primaryBorough, Integer totalInCache, boolean showOnboarding) {
            response.setPrimaryBorough(primaryBorough);
            response.setTotalRestaurantsInCache(totalInCache);
            response.setShowOnboarding(showOnboarding);
            response.setHasOnboarded(!showOnboarding);
            return this;
        }
        
        public Builder performance(long responseTimeMs, boolean usingCache, String dataSource) {
            response.setResponseTimeMs(responseTimeMs);
            response.setUsingCache(usingCache);
            response.setDataSource(dataSource);
            return this;
        }
        
        public HomepageResponseDto build() {
            return response;
        }
    }
    
    public static Builder builder() {
        return new Builder();
    }
} 