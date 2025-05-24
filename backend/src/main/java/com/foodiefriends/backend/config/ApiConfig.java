package com.foodiefriends.backend.config;


import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;

@Configuration
public class ApiConfig {
    @Value("{foursquare.api,key}")
    private String foursquareApiKey;

    public String getFoursquareApiKey() {
        return foursquareApiKey;
    }
}
