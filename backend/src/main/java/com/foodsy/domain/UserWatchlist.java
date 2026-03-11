package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_watchlist",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_user_watchlist", columnNames = {"user_id", "place_id"})
       },
       indexes = {
           @Index(name = "idx_user_watchlist_user_id", columnList = "user_id")
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

    /**
 * Creates a new UserWatchlist entity.
 *
 * Initializes `addedAt` to the current instant; other fields remain unset and should be populated before persistence.
 */
public UserWatchlist() {}

    /**
     * Creates a new UserWatchlist for the given user and place identifier.
     *
     * @param user    the user who owns this watchlist entry
     * @param placeId the external identifier of the place to watch
     */
    public UserWatchlist(User user, String placeId) {
        this.user = user;
        this.placeId = placeId;
    }

    /**
 * Returns the entity's primary key identifier.
 *
 * @return the database identity `id` of this UserWatchlist, or `null` if not yet persisted
 */
public Long getId() { return id; }
    /**
 * Gets the user who owns this watchlist entry.
 *
 * @return the `User` associated with this watchlist entry
 */
public User getUser() { return user; }
    /**
 * Sets the user who owns this watchlist entry.
 *
 * @param user the owning User; must not be null
 */
public void setUser(User user) { this.user = user; }
    /**
 * Gets the identifier of the place associated with this watchlist entry.
 *
 * @return the place identifier stored in the `place_id` column
 */
public String getPlaceId() { return placeId; }
    /**
 * Set the identifier of the place associated with this watchlist entry.
 *
 * @param placeId the place identifier (corresponds to the `place_id` column)
 */
public void setPlaceId(String placeId) { this.placeId = placeId; }
    /**
 * Gets the timestamp when the place was added to the user's watchlist.
 *
 * @return the Instant when this watchlist entry was created
 */
public Instant getAddedAt() { return addedAt; }
    /**
 * Sets the timestamp when this watchlist entry was added.
 *
 * @param addedAt the instant to record as the addition time; expected to be non-null
 */
public void setAddedAt(Instant addedAt) { this.addedAt = addedAt; }
}
