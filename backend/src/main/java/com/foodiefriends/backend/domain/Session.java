package com.foodiefriends.backend.domain;

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
    
    private String status; // open, voting, ended
    private Integer round = 1; // current round (1 or 2)
    private Instant createdAt = Instant.now();

    @Column(name = "join_code", unique = true, nullable = false, length = 6)
    private String joinCode;

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

}
