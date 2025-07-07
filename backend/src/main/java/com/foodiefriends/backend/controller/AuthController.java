package com.foodiefriends.backend.controller;

import com.foodiefriends.backend.domain.User;
import com.foodiefriends.backend.dto.*;
import com.foodiefriends.backend.service.UserService;
import com.foodiefriends.backend.service.JwtService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.security.Principal;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    
    private final UserService userService;
    private final JwtService jwtService;
    
    @Autowired
    public AuthController(UserService userService, JwtService jwtService) {
        this.userService = userService;
        this.jwtService = jwtService;
    }
    
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody SignUpRequest signUpRequest, HttpServletResponse response) {
        try {
            // Sanitize inputs
            String username = sanitizeInput(signUpRequest.username());
            String email = sanitizeInput(signUpRequest.email()).toLowerCase();
            String firstName = sanitizeInput(signUpRequest.firstName());
            String lastName = sanitizeInput(signUpRequest.lastName());
            
            // Validate password confirmation
            if (!signUpRequest.password().equals(signUpRequest.confirmPassword())) {
                return ResponseEntity.badRequest()
                    .body(new AuthResponse("Passwords do not match!", false, null));
            }
            
            // Check for existing users with detailed error messages
            if (userService.existsByEmail(email)) {
                return ResponseEntity.badRequest()
                    .body(new AuthResponse("An account with this email address already exists. Please use a different email or try signing in.", false, null));
            }
            
            if (userService.existsByUsername(username)) {
                return ResponseEntity.badRequest()
                    .body(new AuthResponse("This username is already taken. Please choose a different username.", false, null));
            }
            
            // Create new user with sanitized data
            User user = new User();
            user.setUsername(username);
            user.setEmail(email);
            user.setPassword(signUpRequest.password()); // Will be hashed in service
            user.setFirstName(firstName);
            user.setLastName(lastName);
            
            User savedUser = userService.createUser(user);
            UserDto userDto = convertToDto(savedUser);
            
            // Generate JWT tokens
            String accessToken = jwtService.generateAccessToken(savedUser.getUsername(), savedUser.getEmail());
            String refreshToken = jwtService.generateRefreshToken(savedUser.getUsername());
            
            // Set tokens in HTTP-only cookies
            setTokenCookies(response, accessToken, refreshToken);
            
            return ResponseEntity.ok(new AuthResponse(
                "Account created successfully! Welcome to Foodsie!", 
                true, 
                userDto
            ));
            
        } catch (Exception e) {
            // Log error but don't expose internal details
            System.err.println("Registration error: " + e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthResponse("Registration failed. Please try again.", false, null));
        }
    }
    
    private String sanitizeInput(String input) {
        if (input == null) return null;
        // Remove potentially dangerous characters and trim whitespace
        return input.trim()
                   .replaceAll("[<>\"'&]", "") // Remove potential XSS characters
                   .replaceAll("\\s+", " "); // Normalize whitespace
    }
    
    @PostMapping("/login")
    public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody LoginRequest loginRequest, HttpServletResponse response) {
        try {
            Optional<User> userOptional = userService.findByEmailOrUsername(loginRequest.emailOrUsername());
            
            if (userOptional.isEmpty()) {
                return ResponseEntity.badRequest()
                    .body(new AuthResponse("User not found!", false, null));
            }
            
            User user = userOptional.get();
            
            if (!userService.checkPassword(user, loginRequest.password())) {
                return ResponseEntity.badRequest()
                    .body(new AuthResponse("Invalid password!", false, null));
            }
            
            if (!user.getEnabled()) {
                return ResponseEntity.badRequest()
                    .body(new AuthResponse("Account is disabled!", false, null));
            }
            
            UserDto userDto = convertToDto(user);
            
            // Generate JWT tokens
            String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getEmail());
            String refreshToken = jwtService.generateRefreshToken(user.getUsername());
            
            // Set tokens in HTTP-only cookies
            setTokenCookies(response, accessToken, refreshToken);
            
            return ResponseEntity.ok(new AuthResponse(
                "Login successful!", 
                true, 
                userDto
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(new AuthResponse("Login failed: " + e.getMessage(), false, null));
        }
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Optional<User> userOptional = userService.findByUsername(principal.getName());
            
            if (userOptional.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            UserDto userDto = convertToDto(userOptional.get());
            return ResponseEntity.ok(userDto);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/check-availability")
    public ResponseEntity<AvailabilityResponse> checkAvailability(@RequestBody AvailabilityRequest request) {
        try {
            boolean emailExists = userService.existsByEmail(request.email());
            boolean usernameExists = userService.existsByUsername(request.username());
            
            return ResponseEntity.ok(new AvailabilityResponse(
                !emailExists,
                !usernameExists
            ));
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        // Clear cookies
        clearTokenCookies(response);
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }
    
    @PostMapping("/refresh")
    public ResponseEntity<Map<String, String>> refresh(
            @CookieValue(value = "refreshToken", required = false) String refreshToken,
            HttpServletResponse response) {
        
        if (refreshToken == null || !jwtService.isRefreshToken(refreshToken) || jwtService.isTokenExpired(refreshToken)) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "Invalid refresh token"));
        }
        
        String userId = jwtService.extractUserId(refreshToken);
        Optional<User> userOptional = userService.findByUsername(userId);
        
        if (userOptional.isEmpty()) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("error", "User not found"));
        }
        
        User user = userOptional.get();
        
        // Generate new access token
        String newAccessToken = jwtService.generateAccessToken(user.getUsername(), user.getEmail());
        
        // Set new access token cookie
        setAccessTokenCookie(response, newAccessToken);
        
        return ResponseEntity.ok(Map.of("message", "Token refreshed"));
    }
    
    private void setTokenCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        setAccessTokenCookie(response, accessToken);
        setRefreshTokenCookie(response, refreshToken);
    }
    
    private void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        Cookie accessCookie = new Cookie("accessToken", accessToken);
        accessCookie.setHttpOnly(true);
        accessCookie.setSecure(false); // Set to true in production with HTTPS
        accessCookie.setPath("/");
        accessCookie.setMaxAge(24 * 60 * 60); // 24 hours
        response.addCookie(accessCookie);
    }
    
    private void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        Cookie refreshCookie = new Cookie("refreshToken", refreshToken);
        refreshCookie.setHttpOnly(true);
        refreshCookie.setSecure(false); // Set to true in production with HTTPS
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(7 * 24 * 60 * 60); // 7 days
        response.addCookie(refreshCookie);
    }
    
    private void clearTokenCookies(HttpServletResponse response) {
        Cookie accessCookie = new Cookie("accessToken", "");
        accessCookie.setHttpOnly(true);
        accessCookie.setPath("/");
        accessCookie.setMaxAge(0);
        response.addCookie(accessCookie);
        
        Cookie refreshCookie = new Cookie("refreshToken", "");
        refreshCookie.setHttpOnly(true);
        refreshCookie.setPath("/");
        refreshCookie.setMaxAge(0);
        response.addCookie(refreshCookie);
    }
    
    private UserDto convertToDto(User user) {
        return new UserDto(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getFirstName(),
            user.getLastName(),
            user.getDisplayName(),
            user.getAvatarUrl(),
            user.getDietaryPreferences(),
            user.getFoodAllergies(),
            user.getProvider(),
            user.getEmailVerified(),
            user.getCreatedAt()
        );
    }
}