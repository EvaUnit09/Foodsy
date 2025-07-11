package com.foodsy.domain;

public enum DietaryPreference {
    VEGETARIAN("Vegetarian"),
    VEGAN("Vegan"),
    GLUTEN_FREE("Gluten Free"),
    DAIRY_FREE("Dairy Free"),
    KETO("Keto"),
    PALEO("Paleo"),
    HALAL("Halal"),
    KOSHER("Kosher"),
    PESCATARIAN("Pescatarian"),
    LOW_CARB("Low Carb"),
    LOW_SODIUM("Low Sodium"),
    DIABETIC_FRIENDLY("Diabetic Friendly");

    private final String displayName;

    DietaryPreference(String displayName) {
        this.displayName = displayName;
    }

    public String getDisplayName() {
        return displayName;
    }

    @Override
    public String toString() {
        return displayName;
    }
}