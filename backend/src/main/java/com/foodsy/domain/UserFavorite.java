package com.foodsy.domain;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "user_favorites",
       uniqueConstraints = {
           @UniqueConstraint(name = "uq_user_favorite", columnNames = {"user_id", "place_id"})
       },
       indexes = {
           @Index(name = "idx_user_favorite_user_id", columnList = "user_id")
       })
public class UserFavorite {

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
 * Creates a new UserFavorite entity with `addedAt` initialized to the current instant.
 */
public UserFavorite() {}

    /**
     * Create a UserFavorite for the given user and place identifier.
     *
     * @param user the user who marked the place as a favorite
     * @param placeId the identifier of the place being favorited
     */
    public UserFavorite(User user, String placeId) {
        this.user = user;
        this.placeId = placeId;
    }

    /**
 * Gets the primary key identifier for this UserFavorite.
 *
 * @return the primary key id, or {@code null} if not yet persisted
 */
public Long getId() { return id; }
    /**
 * Gets the user associated with this favorite.
 *
 * @return the associated User, or null if not set
 */
public User getUser() { return user; }
    /**
 * Associate this favorite with the given user.
 *
 * @param user the user who favorited the place; must not be null
 */
public void setUser(User user) { this.user = user; }
    /**
 * Gets the place identifier for this favorite.
 *
 * @return the place identifier (value of the `place_id` column)
 */
public String getPlaceId() { return placeId; }
    /**
 * Sets the identifier of the favorited place.
 *
 * @param placeId the place identifier stored in the database column `place_id`; must not be null
 */
public void setPlaceId(String placeId) { this.placeId = placeId; }
    /**
 * Gets the timestamp when the favorite was added.
 *
 * @return the Instant representing when this favorite was created
 */
public Instant getAddedAt() { return addedAt; }
    /**
 * Set the timestamp when this favorite was added.
 *
 * @param addedAt the instant representing when the favorite was added; should be non-null
 */
public void setAddedAt(Instant addedAt) { this.addedAt = addedAt; }
}
