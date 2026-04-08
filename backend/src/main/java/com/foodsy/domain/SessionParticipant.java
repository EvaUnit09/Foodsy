package com.foodsy.domain;
import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "session_participant",
uniqueConstraints = @UniqueConstraint(columnNames = {"session_id", "user_id"} ))
public class SessionParticipant {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "session_id", nullable = false)
    private Session session;

    @Column(name = "user_id", nullable = false)
    private String userId;

    @Column(name = "joined_at", nullable = false)
    private Instant joinedAt = Instant.now();

    @Column(name = "voting_status", length = 20)
    private String votingStatus = "PENDING"; // PENDING, SUBMITTED

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Session getSession() { return session; }

    public void setSession(Session session) { this.session = session; }

    public String getUserId() { return userId; }

    public void setUserId(String userId) { this.userId = userId; }

    public Instant getJoinedAt() { return joinedAt; }
    public void setJoinedAt(Instant joinedAt) { this.joinedAt = joinedAt; }

    public String getVotingStatus() { return votingStatus; }
    public void setVotingStatus(String votingStatus) { this.votingStatus = votingStatus; }
}
