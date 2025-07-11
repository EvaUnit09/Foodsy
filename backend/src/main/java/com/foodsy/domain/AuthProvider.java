package com.foodsy.domain;

public enum AuthProvider {
    LOCAL("Local"),
    GOOGLE("Google"),
    FACEBOOK("Facebook"),
    GITHUB("GitHub");

    private final String displayName;

    AuthProvider(String displayName) {
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