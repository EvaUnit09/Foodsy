package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
        name = "session",
        uniqueConstraints = @UniqueConstraint(columnNames = "join_code"
        )
)
public class Session {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String creatorId;
    private Integer poolSize;
    private Integer roundTime;
    private Integer likesPerUser;
    
    private String status; // open, voting, ended, expired
    private Integer round = 1; // current round (1 or 2)
    private Instant createdAt = Instant.now();
    private Instant lastActivityAt = Instant.now(); // Track last user activity
    private Instant expiresAt; // When session should auto-close

    private String diningBorough;
    private String diningNeighborhood;
    private String sessionType = "STANDARD"; // STANDARD, OFFLINE, EVENT
    private Integer expectedParticipants;
    private Instant votingDeadline;

    @Column(name = "join_code", unique = true, nullable = false, length = 6)
    private String joinCode;

    @Column(length = 255)
    private String eventName;

    @Column(columnDefinition = "TEXT")
    private String eventDescription;

    // Getters / Setters
    public String getJoinCode() {
        return joinCode;
    }
    public void setJoinCode(String joinCode) {
        this.joinCode = joinCode;
    }

    public void setStatus(String status) {
        this.status = status;
    }
    public String getStatus() {
        return status;
    }
    public void setPoolSize(Integer poolSize) {
        this.poolSize = poolSize;
    }
    public Integer getPoolSize() {
        return poolSize;
    }
    public void setRoundTime(Integer roundTime) {
        this.roundTime = roundTime;
    }
    public Integer getRoundTime() {
        return roundTime;
    }
    public void setLikesPerUser(Integer likesPerUser) {
        this.likesPerUser = likesPerUser;
    }
    public Integer getLikesPerUser() {
        return likesPerUser;
    }
    public void setCreatorId(String creatorId) {
        this.creatorId = creatorId;
    }
    public String getCreatorId() {
        return creatorId;
    }
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
    public Instant getCreatedAt() {
        return createdAt;
    }
    public Long getId() {
        return id;
    }
    public void setId(Long id) {
        this.id = id;
    }
    
    public Integer getRound() {
        return round;
    }
    public void setRound(Integer round) {
        this.round = round;
    }

    public Instant getLastActivityAt() {
        return lastActivityAt;
    }

    public void setLastActivityAt(Instant lastActivityAt) {
        this.lastActivityAt = lastActivityAt;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }

    public void setExpiresAt(Instant expiresAt) {
        this.expiresAt = expiresAt;
    }

    /**
     * Update last activity timestamp to current time
     */
    public void updateActivity() {
        this.lastActivityAt = Instant.now();
    }

    /**
     * Check if session has expired based on expiresAt timestamp
     */
    public boolean isExpired() {
        return expiresAt != null && Instant.now().isAfter(expiresAt);
    }

    /**
     * Check if session is active (not ended or expired)
     */
    public boolean isActive() {
        return !"ended".equals(status) && !"expired".equals(status) && !isExpired();
    }

    public String getDiningBorough() { return diningBorough; }
    public void setDiningBorough(String diningBorough) { this.diningBorough = diningBorough; }

    public String getDiningNeighborhood() { return diningNeighborhood; }
    public void setDiningNeighborhood(String diningNeighborhood) { this.diningNeighborhood = diningNeighborhood; }

    public String getSessionType() { return sessionType; }
    public void setSessionType(String sessionType) { this.sessionType = sessionType; }

    public Integer getExpectedParticipants() { return expectedParticipants; }
    public void setExpectedParticipants(Integer expectedParticipants) { this.expectedParticipants = expectedParticipants; }

    public Instant getVotingDeadline() { return votingDeadline; }
    public void setVotingDeadline(Instant votingDeadline) { this.votingDeadline = votingDeadline; }

    public String getEventName() { return eventName; }
    public void setEventName(String eventName) { this.eventName = eventName; }

    public String getEventDescription() { return eventDescription; }
    public void setEventDescription(String eventDescription) { this.eventDescription = eventDescription; }
}
