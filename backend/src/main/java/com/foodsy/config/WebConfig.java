package com.foodsy.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        System.out.println("Adding CORS mappings at WebMvc level...");
        
        registry.addMapping("/**")
                .allowedOrigins(
                    "https://foodsy-frontend.vercel.app",
                    "http://localhost:3000"
                )
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
        
        // Specific mapping for OAuth2 endpoints
        registry.addMapping("/oauth2/**")
                .allowedOrigins(
                    "https://foodsy-frontend.vercel.app", 
                    "http://localhost:3000",
                    "https://accounts.google.com"
                )
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
                
        registry.addMapping("/login/**")
                .allowedOrigins(
                    "https://foodsy-frontend.vercel.app",
                    "http://localhost:3000",
                    "https://accounts.google.com"
                )
                .allowedMethods("GET", "POST", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true)
                .maxAge(3600);
        
        System.out.println("CORS mappings configured successfully");
    }
}