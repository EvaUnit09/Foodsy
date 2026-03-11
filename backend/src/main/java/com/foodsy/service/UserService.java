package com.foodsy.service;

import com.foodsy.domain.User;
import com.foodsy.domain.AuthProvider;
import com.foodsy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Service
@Transactional
public class UserService {
    
    private final UserRepository userRepository;
    
    @Autowired
    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }
    
    public User createUser(User user) {
        // Normalize username and email
        user.setUsername(user.getUsername().toLowerCase().trim());
        user.setEmail(user.getEmail().toLowerCase().trim());
        
        return userRepository.save(user);
    }
    
    public Optional<User> findByEmail(String email) {
        return userRepository.findByEmail(email.toLowerCase().trim());
    }
    
    public Optional<User> findByUsername(String username) {
        return userRepository.findByUsername(username.toLowerCase().trim());
    }
    
    public Optional<User> findByEmailOrUsername(String emailOrUsername) {
        String normalized = emailOrUsername.toLowerCase().trim();
        return userRepository.findByEmailOrUsername(normalized, normalized);
    }
    
    public Optional<User> findByProviderAndProviderId(AuthProvider provider, String providerId) {
        return userRepository.findByProviderAndProviderId(provider, providerId);
    }
    
    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email.toLowerCase().trim());
    }
    
    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username.toLowerCase().trim());
    }
    
    public User updateUser(User user) {
        return userRepository.save(user);
    }
    
    public void deleteUser(Long userId) {
        userRepository.deleteById(userId);
    }
    
    // Helper method to convert username to user ID for backward compatibility
    public String getUserIdentifier(User user) {
        return user.getUsername();
    }
    
    /**
     * Resolves a User from an identifier that may be an email or a username.
     *
     * @param identifier the email or username to resolve; may be null or blank
     * @return an Optional containing the matching User if found, or Optional.empty() if the identifier is null, blank, or no registered user matches
     */
    public Optional<User> resolveUserFromIdentifier(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return Optional.empty();
        }
        
        // Try to find registered user first
        return findByEmailOrUsername(identifier);
    }
    
    /**
     * Resolve a User from a Spring Security Authentication by mapping the authentication name to a user ID or username.
     *
     * @param authentication the Authentication containing the principal name (may be null or unauthenticated)
     * @return an Optional containing the resolved User if found; empty otherwise
     */
    public Optional<User> findByAuthentication(Authentication authentication) {
        if (authentication == null || !authentication.isAuthenticated()) return Optional.empty();
        String name = authentication.getName();
        try {
            return userRepository.findById(Long.parseLong(name));
        } catch (NumberFormatException e) {
            return findByUsername(name);
        }
    }

    /**
     * Determines whether the provided identifier corresponds to a guest user (no registered user exists for it).
     *
     * @param identifier an email address or username to check; may be null or blank
     * @return `true` if the identifier is non-null, not empty after trimming, and no user exists with that email or username; `false` otherwise
     */
    public boolean isGuestUser(String identifier) {
        return identifier != null && 
               !identifier.trim().isEmpty() && 
               !findByEmailOrUsername(identifier).isPresent();
    }
}