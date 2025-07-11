package com.foodsy.config;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiConfig {
    @Value("${google.places.api.key}")
    private String googlePlacesApiKey;

    public String getGooglePlacesApiKey() {
        return googlePlacesApiKey;
    }
}
