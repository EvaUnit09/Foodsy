package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "user_vote_quota",
    uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "user_id", "round"})
)
public class UserVoteQuota {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "session_id", nullable = false)
    private Long sessionId;
    
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @Column(name = "round", nullable = false)
    private Integer round;
    
    @Column(name = "total_allowed", nullable = false)
    private Integer totalAllowed;
    
    @Column(name = "votes_used", nullable = false)
    private Integer votesUsed = 0;
    
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
    
    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();
    
    // Constructors
    public UserVoteQuota() {}
    
    public UserVoteQuota(Long sessionId, String userId, Integer round, Integer totalAllowed) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.round = round;
        this.totalAllowed = totalAllowed;
        this.votesUsed = 0;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public Integer getRound() { return round; }
    public void setRound(Integer round) { this.round = round; }
    
    public Integer getTotalAllowed() { return totalAllowed; }
    public void setTotalAllowed(Integer totalAllowed) { this.totalAllowed = totalAllowed; }
    
    public Integer getVotesUsed() { return votesUsed; }
    public void setVotesUsed(Integer votesUsed) { 
        this.votesUsed = votesUsed;
        this.updatedAt = Instant.now();
    }
    
    public Integer getRemainingVotes() {
        return Math.max(0, totalAllowed - votesUsed);
    }
    
    public boolean canVote() {
        return votesUsed < totalAllowed;
    }
    
    public void incrementVotesUsed() {
        this.votesUsed++;
        this.updatedAt = Instant.now();
    }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
    
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }
}