package com.foodsy.config;

import com.foodsy.service.JwtService;
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
        
        // Skip JWT validation for OAuth and public endpoints
        String requestPath = request.getRequestURI();
        if (shouldSkipAuthentication(requestPath)) {
            filterChain.doFilter(request, response);
            return;
        }
        
        try {
            // Try to extract token from Authorization header first (preferred method)
            String token = extractTokenFromHeader(request);
            
            // Fallback to cookies if no Authorization header
            if (token == null) {
                token = extractTokenFromCookies(request);
            }
            
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
                }
            }
        } catch (Exception e) {
            logger.warn("JWT authentication failed: " + e.getMessage());
        }
        
        filterChain.doFilter(request, response);
    }
    
    private boolean shouldSkipAuthentication(String path) {
        return path.startsWith("/oauth2/") ||
               path.startsWith("/login/") ||
               path.startsWith("/auth/") ||
               path.equals("/") ||
               path.equals("/hello") ||
               path.equals("/error") ||
               path.startsWith("/ws") ||
               path.startsWith("/restaurants") ||
               path.startsWith("/sessions") ||
               path.startsWith("/homepage");
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