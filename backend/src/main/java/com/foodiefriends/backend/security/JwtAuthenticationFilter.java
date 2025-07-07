package com.foodiefriends.backend.security;

import com.foodiefriends.backend.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

@Component
public class JwtAuthenticationFilter extends OncePerRequestFilter {
    
    private final JwtService jwtService;
    
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }
    
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        
        try {
            String token = extractTokenFromCookies(request);
            
            if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                if (jwtService.isAccessToken(token) && !jwtService.isTokenExpired(token)) {
                    String userId = jwtService.extractUserId(token);
                    String email = jwtService.extractEmail(token);
                    
                    UserDetails userDetails = User.builder()
                            .username(userId)
                            .password("") // Not used for JWT auth
                            .authorities(Collections.emptyList())
                            .build();
                    
                    UsernamePasswordAuthenticationToken authToken = 
                            new UsernamePasswordAuthenticationToken(
                                    userDetails, null, userDetails.getAuthorities());
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                    
                    // Debug logging for voting requests
                    if (request.getRequestURI().contains("/vote")) {
                        System.out.println("JWT Auth for vote request - User: " + userId + ", URI: " + request.getRequestURI());
                    }
                } else {
                    // Debug logging for token issues
                    if (request.getRequestURI().contains("/vote")) {
                        System.out.println("JWT token validation failed for vote request - URI: " + request.getRequestURI() + 
                                         ", isAccessToken: " + (token != null ? jwtService.isAccessToken(token) : "null") +
                                         ", isExpired: " + (token != null ? jwtService.isTokenExpired(token) : "null"));
                    }
                }
            } else {
                // Debug logging for missing token
                if (request.getRequestURI().contains("/vote")) {
                    System.out.println("No JWT token found for vote request - URI: " + request.getRequestURI());
                }
            }
        } catch (Exception e) {
            // Log error but don't block request - user will just be unauthenticated
            logger.warn("JWT authentication failed: " + e.getMessage());
            if (request.getRequestURI().contains("/vote")) {
                System.out.println("JWT authentication error for vote request: " + e.getMessage());
            }
        }
        
        filterChain.doFilter(request, response);
    }
    
    private String extractTokenFromCookies(HttpServletRequest request) {
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            for (Cookie cookie : cookies) {
                if ("accessToken".equals(cookie.getName())) {
                    return cookie.getValue();
                }
            }
        }
        return null;
    }
}