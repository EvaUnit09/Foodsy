package com.foodsy.controller;

import com.foodsy.dto.UserDto;
import com.foodsy.service.UserService;
import com.foodsy.service.JwtService;
import com.foodsy.util.UserMapper;
import com.foodsy.util.CookieUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.security.Principal;
import com.foodsy.domain.User;

@RestController
@RequestMapping("/auth")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    private final UserService userService;
    private final CookieUtil cookieUtil;
    private final JwtService jwtService;
    
    @Autowired
    public AuthController(UserService userService, CookieUtil cookieUtil, JwtService jwtService) {
        this.userService = userService;
        this.cookieUtil = cookieUtil;
        this.jwtService = jwtService;
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refreshToken(HttpServletRequest request, HttpServletResponse response) {
        logger.debug("/auth/refresh called - URI: {}, method: {}", request.getRequestURI(), request.getMethod());
        
        // Try to get refresh token from Authorization header first
        String refreshToken = null;
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            refreshToken = authHeader.substring(7);
            logger.debug("Found refresh token in Authorization header");
        } else {
            // Fallback to cookies
            Cookie[] cookies = request.getCookies();
            logger.debug("Total cookies received: {}", cookies != null ? cookies.length : 0);

            if (cookies != null) {
                for (Cookie cookie : cookies) {
                    logger.debug("Cookie: {} = {}",
                            cookie.getName(),
                            cookie.getValue() != null ? cookie.getValue().substring(0, Math.min(20, cookie.getValue().length())) + "..." : "null");
                    if ("refreshToken".equals(cookie.getName())) {
                        refreshToken = cookie.getValue();
                        logger.debug("Found refresh token cookie");
                    }
                }
            } else {
                logger.debug("No cookies found in request");
            }
        }
        
        if (refreshToken == null) {
            logger.debug("No refresh token found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No refresh token"));
        }
        
        try {
            logger.debug("Validating refresh token...");
            // Validate refresh token
            if (!jwtService.isRefreshToken(refreshToken)) {
                logger.debug("Token is not a refresh token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid refresh token"));
            }
            
            if (jwtService.isTokenExpired(refreshToken)) {
                logger.debug("Refresh token is expired");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Expired refresh token"));
            }
            
            logger.debug("Refresh token is valid, extracting user info...");
            // Extract user info from refresh token
            String username = jwtService.extractUserId(refreshToken);
            logger.debug("Extracted username: {}", username);
            
            Optional<User> userOptional = userService.findByUsername(username);
            
            if (userOptional.isEmpty()) {
                logger.debug("User not found for username: {}", username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }

            User user = userOptional.get();
            logger.debug("User found: {}", user.getEmail());

            // Generate new access token
            String newAccessToken = jwtService.generateAccessToken(user.getUsername(), user.getEmail());
            logger.debug("Generated new access token");

            // Return the new access token in response body for frontend to store
            logger.info("Successfully refreshed token for user: {}", username);
            return ResponseEntity.ok(Map.of(
                "message", "Token refreshed successfully",
                "accessToken", newAccessToken
            ));
            
        } catch (Exception e) {
            logger.error("Error refreshing token: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Token refresh failed"));
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal principal) {
        logger.debug("/auth/me called with principal: {}", principal != null ? principal.getName() : "null");
        
        if (principal == null) {
            logger.debug("No principal found, returning 401");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            String username = principal.getName();
            logger.debug("Looking up user by username: {}", username);
            Optional<User> userOptional = userService.findByUsername(username);
            
            if (userOptional.isEmpty()) {
                logger.debug("User not found for username: {}", username);
                return ResponseEntity.notFound().build();
            }
            
            User user = userOptional.get();
            logger.debug("Found user: {}, username: {}", user.getEmail(), user.getUsername());
            UserDto userDto = UserMapper.toDto(user);
            return ResponseEntity.ok(userDto);
            
        } catch (Exception e) {
            logger.error("Exception in /auth/me: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testAuth(HttpServletRequest request, Principal principal) {
        logger.debug("/auth/test called");

        // Log all cookies
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            logger.debug("Found {} cookies in /auth/test:", cookies.length);
            for (Cookie cookie : cookies) {
                logger.debug("Cookie: {} = {}",
                        cookie.getName(),
                        cookie.getValue() != null ? cookie.getValue().substring(0, Math.min(20, cookie.getValue().length())) + "..." : "null");
            }
        } else {
            logger.debug("No cookies found in /auth/test");
        }
        
        return ResponseEntity.ok(Map.of(
            "message", "Test endpoint working",
            "principal", principal != null ? principal.getName() : "null",
            "cookieCount", cookies != null ? cookies.length : 0
        ));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        // Clear cookies
        cookieUtil.clearAuthCookies(response);
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }
}