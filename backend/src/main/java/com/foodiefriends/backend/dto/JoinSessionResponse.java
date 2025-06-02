package com.foodiefriends.backend.dto;

public class JoinSessionResponse {
    private String userId;
    private Long sessionId;

    public JoinSessionResponse(String userId, Long sessionId) {
        this.userId = userId;
        this.sessionId = sessionId;
    }
    public String getUserId() {
        return userId;
    }
    public Long getSessionId() {
        return sessionId;
    }
    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }
    public void setUserId(String userId) {
        this.userId = userId;
    }

}
