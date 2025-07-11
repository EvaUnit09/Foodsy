package com.foodsy.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import java.util.regex.Pattern;

public class UsernameValidator implements ConstraintValidator<ValidUsername, String> {
    
    private static final int MIN_LENGTH = 3;
    private static final int MAX_LENGTH = 30;
    
    // Username can contain letters, numbers, underscores, and hyphens
    // Must start with a letter or number
    private static final Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9][a-zA-Z0-9_-]*$");
    
    // Prohibited usernames
    private static final String[] PROHIBITED_USERNAMES = {
        "admin", "administrator", "root", "user", "test", "demo", "guest", "null",
        "undefined", "api", "www", "mail", "ftp", "support", "help", "info",
        "contact", "about", "privacy", "terms", "login", "register", "signin",
        "signup", "logout", "profile", "account", "settings", "dashboard",
        "foodie", "foodsy", "restaurant", "session", "vote", "voting"
    };

    @Override
    public void initialize(ValidUsername constraintAnnotation) {
        // No initialization needed
    }

    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        if (username == null) {
            return false;
        }

        // Normalize username
        username = username.trim().toLowerCase();

        // Check length
        if (username.length() < MIN_LENGTH || username.length() > MAX_LENGTH) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                String.format("Username must be between %d and %d characters long", MIN_LENGTH, MAX_LENGTH)
            ).addConstraintViolation();
            return false;
        }

        // Check pattern
        if (!USERNAME_PATTERN.matcher(username).matches()) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Username can only contain letters, numbers, underscores, and hyphens. Must start with a letter or number"
            ).addConstraintViolation();
            return false;
        }

        // Check against prohibited usernames
        for (String prohibited : PROHIBITED_USERNAMES) {
            if (username.equals(prohibited.toLowerCase())) {
                context.disableDefaultConstraintViolation();
                context.buildConstraintViolationWithTemplate(
                    "This username is not available. Please choose a different one"
                ).addConstraintViolation();
                return false;
            }
        }

        // Check for consecutive underscores or hyphens
        if (username.contains("__") || username.contains("--") || username.contains("_-") || username.contains("-_")) {
            context.disableDefaultConstraintViolation();
            context.buildConstraintViolationWithTemplate(
                "Username cannot contain consecutive underscores or hyphens"
            ).addConstraintViolation();
            return false;
        }

        return true;
    }
}