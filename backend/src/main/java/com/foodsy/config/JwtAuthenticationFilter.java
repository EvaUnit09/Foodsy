package com.foodsy.config;

import com.foodsy.service.JwtService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;

public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(JwtAuthenticationFilter.class);
    
    private final JwtService jwtService;
    
    public JwtAuthenticationFilter(JwtService jwtService) {
        this.jwtService = jwtService;
    }
    
    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {
        
        // Skip JWT validation for OAuth and public endpoints
        String requestPath = request.getRequestURI();
        log.debug("JWT FILTER - Request Path: {}, Should Skip: {}", requestPath, shouldSkipAuthentication(requestPath));
        
        if (shouldSkipAuthentication(requestPath)) {
            log.debug("Skipping JWT validation for: {}", requestPath);
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            // Try to extract token from Authorization header first (preferred method)
            String token = extractTokenFromHeader(request);
            log.debug("Token from header: {}", token != null ? token.substring(0, Math.min(20, token.length())) + "..." : "null");
            
            // Fallback to cookies if no Authorization header
            if (token == null) {
                token = extractTokenFromCookies(request);
                log.debug("Token from cookies: {}", token != null ? token.substring(0, Math.min(20, token.length())) + "..." : "null");
            }
            
            if (token != null && SecurityContextHolder.getContext().getAuthentication() == null) {
                log.debug("Processing JWT token...");
                log.debug("Is access token: {}", jwtService.isAccessToken(token));
                log.debug("Is token expired: {}", jwtService.isTokenExpired(token));
                
                if (jwtService.isAccessToken(token) && !jwtService.isTokenExpired(token)) {
                    String userId = jwtService.extractUserId(token);
                    log.debug("Extracted user ID: {}", userId);
                    
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
                    log.debug("JWT authentication successful for user: {}", userId);
                } else {
                    log.debug("JWT token validation failed");
                }
            } else {
                log.debug("No token found or authentication already exists");
            }
        } catch (Exception e) {
            log.warn("JWT authentication failed: {}", e.getMessage(), e);
        }
        
        filterChain.doFilter(request, response);
    }
    
    private boolean shouldSkipAuthentication(String path) {
        // Public endpoints
        if (path.startsWith("/oauth2/") ||
            path.equals("/") ||
            path.equals("/hello") ||
            path.equals("/error") ||
            path.startsWith("/ws") ||
            path.equals("/homepage") ||
            path.equals("/homepage/health") ||
            path.equals("/homepage/test") ||
            path.startsWith("/homepage/taste-profile/options")) {
            return true;
        }

        // Allow unauthenticated access to image proxy endpoints
        if (path.startsWith("/restaurants/photos/")) {
            return true;
        }
        // Allow unauthenticated access to "list photo ids" endpoint
        if (path.matches("/restaurants/[^/]+/photos(?:/.*)?")) {
            return true;
        }

        return false;
    }
    
    private String extractTokenFromHeader(HttpServletRequest request) {
        String bearerToken = request.getHeader("Authorization");
        if (bearerToken != null && bearerToken.startsWith("Bearer ")) {
            return bearerToken.substring(7);
        }
        return null;
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