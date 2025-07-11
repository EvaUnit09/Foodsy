package com.foodsy.dto;

import com.foodsy.domain.UserTastePreferences;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;

import java.time.Instant;
import java.util.Set;

public class TasteProfileDto {
    
    @NotEmpty(message = "At least one cuisine preference is required")
    private Set<String> preferredCuisines;
    
    @NotNull(message = "Price range is required")
    @Pattern(regexp = "^\\$|\\$\\$|\\$\\$\\$$", message = "Price range must be $, $$, or $$$")
    private String priceRange;
    
    @NotNull(message = "Preferred borough is required")
    @Pattern(regexp = "^(Manhattan|Brooklyn|Queens|Bronx|Staten Island)$", message = "Borough must be one of: Manhattan, Brooklyn, Queens, Bronx, Staten Island")
    private String preferredBorough;
    
    private Instant createdAt;
    private Instant updatedAt;
    
    // Constructors
    public TasteProfileDto() {}
    
    public TasteProfileDto(Set<String> preferredCuisines, String priceRange, String preferredBorough) {
        this.preferredCuisines = preferredCuisines;
        this.priceRange = priceRange;
        this.preferredBorough = preferredBorough;
    }
    
    // Factory method to create from entity
    public static TasteProfileDto fromEntity(UserTastePreferences entity) {
        TasteProfileDto dto = new TasteProfileDto();
        dto.setPreferredCuisines(entity.getPreferredCuisines());
        dto.setPriceRange(entity.getPriceRange());
        dto.setPreferredBorough(entity.getPreferredBorough());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        return dto;
    }
    
    // Getters and Setters
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
    
    // Helper methods
    public Integer getPriceLevelAsInteger() {
        if (priceRange == null) return null;
        switch (priceRange) {
            case "$": return 1;
            case "$$": return 2;
            case "$$$": return 3;
            default: return null;
        }
    }
    
    public boolean hasVeganVegetarianPreference() {
        return preferredCuisines != null && 
               (preferredCuisines.contains("Vegan") || preferredCuisines.contains("Vegetarian"));
    }
    
    public boolean isComplete() {
        return preferredCuisines != null && !preferredCuisines.isEmpty() &&
               priceRange != null && !priceRange.isEmpty() &&
               preferredBorough != null && !preferredBorough.isEmpty();
    }
} 