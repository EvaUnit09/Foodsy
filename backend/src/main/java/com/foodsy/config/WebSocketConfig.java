package com.foodsy.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;
import org.springframework.lang.NonNull;

@Configuration
@EnableWebSocketMessageBroker
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {
    @Override
    public void configureMessageBroker(@NonNull MessageBrokerRegistry config) {
        config.enableSimpleBroker("/topic"); // Enables a simple in-memory broker
        config.setApplicationDestinationPrefixes("/app");
    }

    @Override
    public void registerStompEndpoints(@NonNull StompEndpointRegistry registry) {
        // Single SockJS endpoint — handles WebSocket + HTTP fallbacks (XHR-streaming, long-poll)
        // setAllowedOriginPatterns("*") is required for cross-origin WebSocket upgrades;
        // setAllowedOrigins() performs a strict equality check and returns 400 for any mismatch.
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns("*")
                .withSockJS();
    }
} 