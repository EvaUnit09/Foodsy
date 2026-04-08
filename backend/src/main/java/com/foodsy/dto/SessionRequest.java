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
    private String diningBorough;
    private String diningNeighborhood;
    private String sessionType;
    private Integer expectedParticipants;
    private String votingDeadline; // ISO-8601 timestamp

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

    public String getDiningBorough() { return diningBorough; }
    public void setDiningBorough(String diningBorough) { this.diningBorough = diningBorough; }

    public String getDiningNeighborhood() { return diningNeighborhood; }
    public void setDiningNeighborhood(String diningNeighborhood) { this.diningNeighborhood = diningNeighborhood; }

    public String getSessionType() { return sessionType; }
    public void setSessionType(String sessionType) { this.sessionType = sessionType; }

    public Integer getExpectedParticipants() { return expectedParticipants; }
    public void setExpectedParticipants(Integer expectedParticipants) { this.expectedParticipants = expectedParticipants; }

    public String getVotingDeadline() { return votingDeadline; }
    public void setVotingDeadline(String votingDeadline) { this.votingDeadline = votingDeadline; }
}


