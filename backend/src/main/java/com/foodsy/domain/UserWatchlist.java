package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_watchlist",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_user_watchlist", columnNames = {"user_id", "place_id"})
       },
       indexes = {
           @Index(name = "idx_user_watchlist_user_id_added_at", columnList = "user_id, added_at")
       })
public class UserWatchlist {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "place_id", nullable = false)
    private String placeId;

    @Column(name = "added_at", nullable = false)
    private Instant addedAt = Instant.now();

    public UserWatchlist() {}

    public UserWatchlist(User user, String placeId) {
        this.user = user;
        this.placeId = placeId;
    }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getPlaceId() { return placeId; }
    public void setPlaceId(String placeId) { this.placeId = placeId; }
    public Instant getAddedAt() { return addedAt; }
    public void setAddedAt(Instant addedAt) { this.addedAt = addedAt; }
}
