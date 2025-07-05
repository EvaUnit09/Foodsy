package com.foodiefriends.backend.controller;

import com.foodiefriends.backend.domain.User;
import com.foodiefriends.backend.dto.*;
import com.foodiefriends.backend.service.UserService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Optional;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "http://localhost:3000")
public class AuthController {
    
    private final UserService userService;
    
    @Autowired
    public AuthController(UserService userService) {
        this.userService = userService;
    }
    
    @PostMapping("/signup")
    public ResponseEntity<AuthResponse> registerUser(@Valid @RequestBody SignUpRequest signUpRequest) {
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
    public ResponseEntity<AuthResponse> loginUser(@Valid @RequestBody LoginRequest loginRequest) {
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
    public ResponseEntity<UserDto> getCurrentUser(@RequestParam String username) {
        try {
            Optional<User> userOptional = userService.findByUsername(username);
            
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