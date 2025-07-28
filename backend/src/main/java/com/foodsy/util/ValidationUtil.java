package com.foodsy.util;

import com.foodsy.dto.SignUpRequest;
import org.springframework.stereotype.Component;

import java.util.regex.Pattern;

/**
 * Utility class for input validation and sanitization
 * Eliminates duplication of validation logic across controllers
 */
@Component
public class ValidationUtil {
    
    // Common validation patterns
    private static final Pattern EMAIL_PATTERN = Pattern.compile(
        "^[a-zA-Z0-9_+&*-]+(?:\\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\\.)+[a-zA-Z]{2,7}$"
    );
    
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_-]{3,20}$");
    
    private static final Pattern PASSWORD_PATTERN = Pattern.compile(
        "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@#$%^&+=!]).{8,}$"
    );
    
    private static final Pattern NAME_PATTERN = Pattern.compile("^[a-zA-Z\\s'-]{1,50}$");
    
    /**
     * Sanitize input by removing potentially harmful characters
     */
    public static String sanitizeInput(String input) {
        if (input == null) {
            return null;
        }
        
        return input.trim()
                   .replaceAll("\\s+", " ") // Replace multiple spaces with single space
                   .replaceAll("[<>\"'&]", ""); // Remove potentially harmful characters
    }
    
    /**
     * Validate email format
     */
    public static boolean isValidEmail(String email) {
        return email != null && EMAIL_PATTERN.matcher(email).matches();
    }
    
    /**
     * Validate username format
     */
    public static boolean isValidUsername(String username) {
        return username != null && USERNAME_PATTERN.matcher(username).matches();
    }
    
    /**
     * Validate password strength
     */
    public static boolean isValidPassword(String password) {
        return password != null && PASSWORD_PATTERN.matcher(password).matches();
    }
    
    /**
     * Validate name format (first name, last name)
     */
    public static boolean isValidName(String name) {
        return name == null || name.isEmpty() || NAME_PATTERN.matcher(name).matches();
    }
    
    /**
     * Sanitize and validate a SignUpRequest
     */
    public static SignUpRequest sanitizeAndValidateSignUpRequest(SignUpRequest request) {
        if (request == null) {
            throw new IllegalArgumentException("SignUp request cannot be null");
        }
        
        String sanitizedUsername = sanitizeInput(request.username());
        String sanitizedEmail = sanitizeInput(request.email());
        String sanitizedFirstName = sanitizeInput(request.firstName());
        String sanitizedLastName = sanitizeInput(request.lastName());
        
        // Validate sanitized inputs
        if (!isValidUsername(sanitizedUsername)) {
            throw new IllegalArgumentException("Invalid username format. Username must be 3-20 characters and contain only letters, numbers, hyphens, and underscores.");
        }
        
        if (!isValidEmail(sanitizedEmail)) {
            throw new IllegalArgumentException("Invalid email format.");
        }
        
        if (!isValidPassword(request.password())) {
            throw new IllegalArgumentException("Password must be at least 8 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character.");
        }
        
        if (!isValidName(sanitizedFirstName)) {
            throw new IllegalArgumentException("Invalid first name format.");
        }
        
        if (!isValidName(sanitizedLastName)) {
            throw new IllegalArgumentException("Invalid last name format.");
        }
        
        if (!request.password().equals(request.confirmPassword())) {
            throw new IllegalArgumentException("Passwords do not match.");
        }
        
        return new SignUpRequest(
            sanitizedUsername,
            sanitizedEmail.toLowerCase(), // Normalize email to lowercase
            sanitizedFirstName,
            sanitizedLastName,
            request.password(),
            request.confirmPassword()
        );
    }
    
    /**
     * Validate session parameters
     */
    public static void validateSessionParameters(Integer poolSize, Integer roundTime, Integer likesPerUser) {
        if (poolSize == null || poolSize < 5 || poolSize > 50) {
            throw new IllegalArgumentException("Pool size must be between 5 and 50.");
        }
        
        if (roundTime == null || roundTime < 30 || roundTime > 600) {
            throw new IllegalArgumentException("Round time must be between 30 and 600 seconds.");
        }
        
        if (likesPerUser == null || likesPerUser < 1 || likesPerUser > 10) {
            throw new IllegalArgumentException("Likes per user must be between 1 and 10.");
        }
    }
    
    /**
     * Validate join code format
     */
    public static boolean isValidJoinCode(String joinCode) {
        return joinCode != null && joinCode.matches("^[A-Z0-9]{6}$");
    }
    
    /**
     * Validate restaurant ID format (assuming UUID or similar)
     */
    public static boolean isValidRestaurantId(String restaurantId) {
        return restaurantId != null && !restaurantId.trim().isEmpty() && restaurantId.length() <= 100;
    }
    
    /**
     * Validate user ID format
     */
    public static boolean isValidUserId(String userId) {
        return userId != null && !userId.trim().isEmpty() && userId.length() <= 50;
    }
}