package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "user_daily_feed",
       uniqueConstraints = @UniqueConstraint(
           name = "uq_user_daily_feed_user_date_borough",
           columnNames = {"user_id", "feed_date", "borough"}),
       indexes = @Index(name = "idx_user_daily_feed_feed_date", columnList = "feed_date"))
public class UserDailyFeed {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "feed_date", nullable = false)
    private LocalDate feedDate;

    @Column(length = 50, nullable = false)
    private String borough;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String placeIds; // comma-separated, order preserved

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public UserDailyFeed() {}

    public Long getId() { return id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public LocalDate getFeedDate() { return feedDate; }
    public void setFeedDate(LocalDate feedDate) { this.feedDate = feedDate; }

    public String getBorough() { return borough; }
    public void setBorough(String borough) { this.borough = borough; }

    public String getPlaceIds() { return placeIds; }
    public void setPlaceIds(String placeIds) { this.placeIds = placeIds; }

    public Instant getCreatedAt() { return createdAt; }
}
