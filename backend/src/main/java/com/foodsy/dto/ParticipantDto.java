package com.foodsy.dto;

import java.time.Instant;

public class ParticipantDto {
    private String userId;
    private String role;
    private Instant joinedAt;
    private boolean isHost;

    public ParticipantDto(String userId, String role, boolean isHost) {
        this.userId = userId;
        this.role = role;
        this.joinedAt = Instant.now();
        this.isHost = isHost;
    }

    public ParticipantDto(String userId) {
        this.userId = userId;
        this.role = "participant";
        this.joinedAt = Instant.now();
        this.isHost = false;
    }

    public String getUserId() {
        return userId;
    }
    public void setUserId(String userId) {
        this.userId = userId;
    }
    public String getRole() {
        return role;
    }
    public void setRole(String role) {
        this.role = role;
    }
    public Instant getJoinedAt() {
        return joinedAt;
    }
    public void setJoinedAt(Instant joinedAt) {
        this.joinedAt = joinedAt;
    }
    public boolean isHost() {
        return isHost;
    }
    public void setHost(boolean host) {
        isHost = host;
    }
}






