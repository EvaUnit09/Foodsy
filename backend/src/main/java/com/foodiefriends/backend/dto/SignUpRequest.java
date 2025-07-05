package com.foodiefriends.backend.dto;

import com.foodiefriends.backend.validation.ValidPassword;
import com.foodiefriends.backend.validation.ValidUsername;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record SignUpRequest(
        @NotBlank(message = "Username is required")
        @ValidUsername
        String username,
        
        @NotBlank(message = "Email is required")
        @Email(message = "Please provide a valid email address")
        @Pattern(regexp = "^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$", 
                message = "Please provide a valid email address")
        String email,
        
        @NotBlank(message = "Password is required")
        @ValidPassword
        String password,
        
        @NotBlank(message = "Confirm password is required")
        String confirmPassword,
        
        @Size(max = 50, message = "First name cannot exceed 50 characters")
        @Pattern(regexp = "^[a-zA-Z\\s'-]*$", message = "First name can only contain letters, spaces, hyphens, and apostrophes")
        String firstName,
        
        @Size(max = 50, message = "Last name cannot exceed 50 characters")
        @Pattern(regexp = "^[a-zA-Z\\s'-]*$", message = "Last name can only contain letters, spaces, hyphens, and apostrophes")
        String lastName
) {}