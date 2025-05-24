package com.foodiefriends.backend.domain;

import jakarta.persistence.*;

@Entity
public class SessionRestaurant {

    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Long sessionId; // FK to Session
    private String providerId; //Foursquare fsq_id
    private String name;
    private String address;
    private String category;

    private Integer likeCount = 0;
    private Integer round = 1;


    public SessionRestaurant() {

    }

    public Long getSessionId() {
        return sessionId;
    }
    public void setSessionId(Long sessionId) {
        this.sessionId = sessionId;
    }
    public String getProviderId() {
        return providerId;
    }
    public void setProviderId(String providerId) {
        this.providerId = providerId;
    }
    public String getName() {
        return name;
    }
    public void setName(String name) {
        this.name = name;
    }
    public String getAddress() {
        return address;
    }
    public void setAddress(String address) {
        this.address = address;
    }
    public String getCategory() {
        return category;
    }
    public void setCategory(String category) {
        this.category = category;
    }
    public Integer getLikeCount() {
        return likeCount;
    }
    public void setLikeCount(Integer likeCount) {
        this.likeCount = likeCount;
    }
    public Integer getRound() {
        return round;
    }
    public void setRound(Integer round) {
        this.round = round;
    }

}
