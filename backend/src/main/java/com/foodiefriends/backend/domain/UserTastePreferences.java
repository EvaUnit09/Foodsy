package com.foodiefriends.backend.domain;

import jakarta.persistence.*;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.Set;

@Entity
@Table(name = "user_taste_preferences")
public class UserTastePreferences {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    @NotNull
    private User user;
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "user_preferred_cuisines", joinColumns = @JoinColumn(name = "preference_id"))
    @Column(name = "cuisine")
    private Set<String> preferredCuisines; // Italian, Chinese, Mexican, Vegan, Vegetarian, etc.
    
    @Column(name = "price_range", length = 10)
    private String priceRange; // $, $$, $$$
    
    @Column(name = "preferred_borough", length = 50)
    private String preferredBorough; // Manhattan, Brooklyn, Queens, Bronx, Staten Island
    
    @Column(name = "created_at")
    private Instant createdAt = Instant.now();
    
    @Column(name = "updated_at")
    private Instant updatedAt = Instant.now();
    
    // Constructors
    public UserTastePreferences() {}
    
    public UserTastePreferences(User user, Set<String> preferredCuisines, String priceRange, String preferredBorough) {
        this.user = user;
        this.preferredCuisines = preferredCuisines;
        this.priceRange = priceRange;
        this.preferredBorough = preferredBorough;
    }
    
    // Getters and Setters
    public Long getId() {
        return id;
    }
    
    public void setId(Long id) {
        this.id = id;
    }
    
    public User getUser() {
        return user;
    }
    
    public void setUser(User user) {
        this.user = user;
    }
    
    public Set<String> getPreferredCuisines() {
        return preferredCuisines;
    }
    
    public void setPreferredCuisines(Set<String> preferredCuisines) {
        this.preferredCuisines = preferredCuisines;
    }
    
    public String getPriceRange() {
        return priceRange;
    }
    
    public void setPriceRange(String priceRange) {
        this.priceRange = priceRange;
    }
    
    public String getPreferredBorough() {
        return preferredBorough;
    }
    
    public void setPreferredBorough(String preferredBorough) {
        this.preferredBorough = preferredBorough;
    }
    
    public Instant getCreatedAt() {
        return createdAt;
    }
    
    public void setCreatedAt(Instant createdAt) {
        this.createdAt = createdAt;
    }
    
    public Instant getUpdatedAt() {
        return updatedAt;
    }
    
    public void setUpdatedAt(Instant updatedAt) {
        this.updatedAt = updatedAt;
    }
    
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
    
    // Helper method to get price level as integer (1=$, 2=$$, 3=$$$)
    public Integer getPriceLevelAsInteger() {
        if (priceRange == null) return null;
        switch (priceRange) {
            case "$": return 1;
            case "$$": return 2;
            case "$$$": return 3;
            default: return null;
        }
    }
    
    // Helper method to check if user prefers vegan/vegetarian options
    public boolean hasVeganVegetarianPreference() {
        return preferredCuisines != null && 
               (preferredCuisines.contains("Vegan") || preferredCuisines.contains("Vegetarian"));
    }
} 