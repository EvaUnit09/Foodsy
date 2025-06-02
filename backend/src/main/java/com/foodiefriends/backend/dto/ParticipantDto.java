package com.foodiefriends.backend.dto;

import java.time.Instant;

public class ParticipantDto {
    private String userId;
    private String role;
    private Instant joinedAt;

    public ParticipantDto() {

    }
    public ParticipantDto(String userId) {
        this.userId = userId;
    }
    public String getUserId() {
        return userId;
    }
    public void setUserId(String userId) {
        this.userId = userId;
    }
}






