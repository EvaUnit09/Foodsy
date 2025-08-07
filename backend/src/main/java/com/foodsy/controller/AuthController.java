package com.foodsy.controller;

import com.foodsy.dto.UserDto;
import com.foodsy.service.UserService;
import com.foodsy.service.JwtService;
import com.foodsy.util.UserMapper;
import com.foodsy.util.CookieUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
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
        System.out.println("=== AuthController - /auth/refresh called ===");
        System.out.println("Request URI: " + request.getRequestURI());
        System.out.println("Request method: " + request.getMethod());
        
        // Try to get refresh token from Authorization header first
        String refreshToken = null;
        String authHeader = request.getHeader("Authorization");
        
        if (authHeader != null && authHeader.startsWith("Bearer ")) {
            refreshToken = authHeader.substring(7);
            System.out.println("AuthController - Found refresh token in Authorization header");
        } else {
            // Fallback to cookies
            Cookie[] cookies = request.getCookies();
            System.out.println("AuthController - Total cookies received: " + (cookies != null ? cookies.length : 0));
            
            if (cookies != null) {
                System.out.println("AuthController - Cookie names:");
                for (Cookie cookie : cookies) {
                    System.out.println("AuthController - Cookie: " + cookie.getName() + " = " + (cookie.getValue() != null ? cookie.getValue().substring(0, Math.min(20, cookie.getValue().length())) + "..." : "null"));
                    if ("refreshToken".equals(cookie.getName())) {
                        refreshToken = cookie.getValue();
                        System.out.println("AuthController - Found refresh token cookie");
                    }
                }
            } else {
                System.out.println("AuthController - No cookies found in request");
            }
        }
        
        if (refreshToken == null) {
            System.out.println("AuthController - No refresh token found");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "No refresh token"));
        }
        
        try {
            System.out.println("AuthController - Validating refresh token...");
            // Validate refresh token
            if (!jwtService.isRefreshToken(refreshToken)) {
                System.out.println("AuthController - Token is not a refresh token");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid refresh token"));
            }
            
            if (jwtService.isTokenExpired(refreshToken)) {
                System.out.println("AuthController - Refresh token is expired");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Expired refresh token"));
            }
            
            System.out.println("AuthController - Refresh token is valid, extracting user info...");
            // Extract user info from refresh token
            String username = jwtService.extractUserId(refreshToken);
            System.out.println("AuthController - Extracted username: " + username);
            
            Optional<User> userOptional = userService.findByUsername(username);
            
            if (userOptional.isEmpty()) {
                System.out.println("AuthController - User not found for username: " + username);
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
            }
            
            User user = userOptional.get();
            System.out.println("AuthController - User found: " + user.getEmail());
            
            // Generate new access token
            String newAccessToken = jwtService.generateAccessToken(user.getUsername(), user.getEmail());
            System.out.println("AuthController - Generated new access token");
            
            // Return the new access token in response body for frontend to store
            System.out.println("AuthController - Successfully refreshed token for user: " + username);
            return ResponseEntity.ok(Map.of(
                "message", "Token refreshed successfully",
                "accessToken", newAccessToken
            ));
            
        } catch (Exception e) {
            System.err.println("AuthController - Error refreshing token: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "Token refresh failed"));
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal principal) {
        System.out.println("AuthController - /auth/me called with principal: " + (principal != null ? principal.getName() : "null"));
        
        if (principal == null) {
            System.out.println("AuthController - No principal found, returning 401");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            String username = principal.getName();
            System.out.println("AuthController - Looking up user by username: " + username);
            Optional<User> userOptional = userService.findByUsername(username);
            
            if (userOptional.isEmpty()) {
                System.out.println("AuthController - User not found for username: " + username);
                return ResponseEntity.notFound().build();
            }
            
            User user = userOptional.get();
            System.out.println("AuthController - Found user: " + user.getEmail() + ", username: " + user.getUsername());
            UserDto userDto = UserMapper.toDto(user);
            return ResponseEntity.ok(userDto);
            
        } catch (Exception e) {
            System.err.println("AuthController - Exception in /auth/me: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testAuth(HttpServletRequest request, Principal principal) {
        System.out.println("AuthController - /auth/test called");
        
        // Log all cookies
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            System.out.println("AuthController - Found " + cookies.length + " cookies in /auth/test:");
            for (Cookie cookie : cookies) {
                System.out.println("AuthController - Cookie: " + cookie.getName() + " = " + (cookie.getValue() != null ? cookie.getValue().substring(0, Math.min(20, cookie.getValue().length())) + "..." : "null"));
            }
        } else {
            System.out.println("AuthController - No cookies found in /auth/test");
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