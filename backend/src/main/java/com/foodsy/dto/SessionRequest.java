package com.foodsy.dto;

/**
 * Request payload for creating a session.
 * Optional latitude/longitude allow browser-provided coordinates.
 */
public class SessionRequest {
    private Integer poolSize;
    private Integer roundTime;
    private Integer likesPerUser;
    private Double lat;
    private Double lng;

    public Integer getPoolSize() { return poolSize; }
    public void setPoolSize(Integer poolSize) { this.poolSize = poolSize; }

    public Integer getRoundTime() { return roundTime; }
    public void setRoundTime(Integer roundTime) { this.roundTime = roundTime; }

    public Integer getLikesPerUser() { return likesPerUser; }
    public void setLikesPerUser(Integer likesPerUser) { this.likesPerUser = likesPerUser; }

    public Double getLat() { return lat; }
    public void setLat(Double lat) { this.lat = lat; }

    public Double getLng() { return lng; }
    public void setLng(Double lng) { this.lng = lng; }
}


