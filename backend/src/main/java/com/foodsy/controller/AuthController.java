package com.foodsy.controller;

import com.foodsy.domain.User;
import com.foodsy.dto.*;
import com.foodsy.service.UserService;
import com.foodsy.service.JwtService;
import com.foodsy.util.UserMapper;
import com.foodsy.util.CookieUtil;
import com.foodsy.util.ValidationUtil;
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
@RequestMapping("/auth")
public class AuthController {
    
    private final UserService userService;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    
    @Autowired
    public AuthController(UserService userService, JwtService jwtService, CookieUtil cookieUtil) {
        this.userService = userService;
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
    }
    
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody SignUpRequest signUpRequest, HttpServletResponse response) {
        try {
            // Sanitize and validate inputs
            SignUpRequest validatedRequest = ValidationUtil.sanitizeAndValidateSignUpRequest(signUpRequest);
            
            String username = validatedRequest.username();
            String email = validatedRequest.email();
            String firstName = validatedRequest.firstName();
            String lastName = validatedRequest.lastName();
            
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
            UserDto userDto = UserMapper.toDto(savedUser);
            
            // Generate JWT tokens
            String accessToken = jwtService.generateAccessToken(savedUser.getUsername(), savedUser.getEmail());
            String refreshToken = jwtService.generateRefreshToken(savedUser.getUsername());
            
            // Set tokens in HTTP-only cookies
            setTokenCookies(response, accessToken, refreshToken);
            
            return ResponseEntity.ok(new AuthResponse(
                "Account created successfully! Welcome to Foodsy!", 
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
            
            UserDto userDto = UserMapper.toDto(user);
            
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
            
            UserDto userDto = UserMapper.toDto(userOptional.get());
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
        cookieUtil.clearAuthCookies(response);
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
        cookieUtil.setAccessTokenCookie(response, newAccessToken);
        
        return ResponseEntity.ok(Map.of("message", "Token refreshed"));
    }
    
    private void setTokenCookies(HttpServletResponse response, String accessToken, String refreshToken) {
        cookieUtil.setAccessTokenCookie(response, accessToken);
        cookieUtil.setRefreshTokenCookie(response, refreshToken);
    }
}