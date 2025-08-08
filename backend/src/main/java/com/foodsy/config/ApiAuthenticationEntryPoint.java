package com.foodsy.config;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import java.io.IOException;
import java.util.HashMap;
import java.util.Map;

/**
 * Custom AuthenticationEntryPoint that returns JSON error responses
 * instead of redirecting to login pages for API requests.
 */
@Component
public class ApiAuthenticationEntryPoint implements AuthenticationEntryPoint {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void commence(HttpServletRequest request, 
                        HttpServletResponse response,
                        AuthenticationException authException) throws IOException {
        
        String requestUri = request.getRequestURI();
        
        // Check if this is an API request
        if (isApiRequest(requestUri)) {
            // Return JSON error response for API requests
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            
            Map<String, Object> errorResponse = new HashMap<>();
            errorResponse.put("error", "Unauthorized");
            errorResponse.put("message", "Authentication required");
            errorResponse.put("status", 401);
            errorResponse.put("path", requestUri);
            errorResponse.put("timestamp", System.currentTimeMillis());
            
            response.getWriter().write(objectMapper.writeValueAsString(errorResponse));
        } else {
            // Redirect to OAuth2 login for web requests
            response.sendRedirect("/oauth2/authorization/google");
        }
    }
    
    /**
     * Determine if this is an API request that should return JSON
     * instead of redirecting to login.
     */
    private boolean isApiRequest(String requestUri) {
        return requestUri.startsWith("/sessions") ||
               requestUri.startsWith("/restaurants") ||
               requestUri.startsWith("/votes") ||
               requestUri.startsWith("/users") ||
               requestUri.startsWith("/ws") ||
               requestUri.startsWith("/actuator") ||
               requestUri.contains("/api/");
    }
}