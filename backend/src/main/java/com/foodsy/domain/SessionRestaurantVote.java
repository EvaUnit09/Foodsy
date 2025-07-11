package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(
    name = "session_restaurant_vote",
    uniqueConstraints = @UniqueConstraint(
        name = "uc_session_restaurant_vote",
        columnNames = {"session_id", "provider_id", "user_id", "round"}
    )
)
public class SessionRestaurantVote {

    // ---------- primary key ----------
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ---------- relations ----------
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;               // ← the *only* mapping to session_id

    // ---------- columns ----------
    @Column(name = "provider_id", nullable = false)
    private String providerId;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(nullable = false)
    private Integer round;

    @Enumerated(EnumType.STRING)
    @Column(name = "vote_type", nullable = false)
    private VoteType voteType;

    @Column(name = "voted_at", nullable = false, updatable = false)
    private Instant votedAt = Instant.now();

    // ---------- getters / setters ----------
    public Long getId() { return id; }

    /** Helper for convenience (not persisted twice) */
    public Long getSessionId() {
        return session != null ? session.getId() : null;
    }

    public Session getSession() { return session; }
    public void setSession(Session session) { this.session = session; }

    public String getProviderId() { return providerId; }
    public void setProviderId(String providerId) { this.providerId = providerId; }

    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }

    public Integer getRound() { return round; }
    public void setRound(Integer round) { this.round = round; }

    public VoteType getVoteType() { return voteType; }
    public void setVoteType(VoteType voteType) { this.voteType = voteType; }

    public Instant getVotedAt() { return votedAt; }
}