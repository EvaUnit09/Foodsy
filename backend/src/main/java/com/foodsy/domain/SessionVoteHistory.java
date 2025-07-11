package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "session_vote_history",
    uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "user_id", "provider_id", "round"})
)
public class SessionVoteHistory {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(name = "session_id", nullable = false)
    private Long sessionId;
    
    @Column(name = "user_id", nullable = false)
    private String userId;
    
    @Column(name = "provider_id", nullable = false)
    private String providerId;
    
    @Column(name = "round", nullable = false)
    private Integer round;
    
    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false)
    private VoteType voteType;
    
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
    
    // Constructors
    public SessionVoteHistory() {}
    
    public SessionVoteHistory(Long sessionId, String userId, String providerId, Integer round, VoteType voteType) {
        this.sessionId = sessionId;
        this.userId = userId;
        this.providerId = providerId;
        this.round = round;
        this.voteType = voteType;
    }
    
    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    
    public Long getSessionId() { return sessionId; }
    public void setSessionId(Long sessionId) { this.sessionId = sessionId; }
    
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    
    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }
    
    public Integer getRound() { return round; }
    public void setRound(Integer round) { this.round = round; }
    
    public VoteType getVoteType() { return voteType; }
    public void setVoteType(VoteType voteType) { this.voteType = voteType; }
    
    public Instant getCreatedAt() { return createdAt; }
    public void setCreatedAt(Instant createdAt) { this.createdAt = createdAt; }
}