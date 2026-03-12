package com.foodsy.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class HomepageResponseDto {

    // User context
    private boolean isAuthenticated;
    private String userName;

    // Homepage sections
    private List<RestaurantSummaryDto> yourPicks;
    @JsonProperty("highlights")
    private List<RestaurantSummaryDto> neighborhoodHighlights;
    @JsonProperty("trending")
    private List<RestaurantSummaryDto> trendingNow;
    private List<RestaurantSummaryDto> spotlight;

    // Metadata
    private String primaryBorough;
    private Integer totalRestaurantsInCache;

    // Performance info
    private long responseTimeMs;
    private boolean usingCache;
    private String dataSource;

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

    // Builder pattern
    public static class Builder {
        private HomepageResponseDto response = new HomepageResponseDto();

        public Builder authenticated(boolean authenticated, String userName) {
            response.setAuthenticated(authenticated);
            response.setUserName(userName);
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

        public Builder metadata(String primaryBorough, Integer totalInCache) {
            response.setPrimaryBorough(primaryBorough);
            response.setTotalRestaurantsInCache(totalInCache);
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
