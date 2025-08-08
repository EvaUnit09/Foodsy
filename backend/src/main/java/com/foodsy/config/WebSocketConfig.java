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
        // Native WebSocket endpoint for HTTPS connections
        registry.addEndpoint("/ws")
                .setAllowedOrigins("https://foodsy-frontend.vercel.app", "http://localhost:3000");
                
        // SockJS fallback endpoint for HTTP connections
        registry.addEndpoint("/ws-sockjs")
                .setAllowedOrigins("https://foodsy-frontend.vercel.app", "http://localhost:3000")
                .withSockJS();
    }
} 