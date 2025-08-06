package com.foodsy.service;

import com.foodsy.domain.User;
import com.foodsy.domain.AuthProvider;
import com.foodsy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
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
    
    // Method to resolve user from identifier (supports both registered users and guests)
    public Optional<User> resolveUserFromIdentifier(String identifier) {
        if (identifier == null || identifier.trim().isEmpty()) {
            return Optional.empty();
        }
        
        // Try to find registered user first
        return findByEmailOrUsername(identifier);
    }
    
    // Check if identifier represents a guest user (not in database)
    public boolean isGuestUser(String identifier) {
        return identifier != null && 
               !identifier.trim().isEmpty() && 
               !findByEmailOrUsername(identifier).isPresent();
    }
}