package com.foodsy.service;

import com.foodsy.domain.AuthProvider;
import com.foodsy.domain.User;
import com.foodsy.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.client.userinfo.DefaultOAuth2UserService;
import org.springframework.security.oauth2.client.userinfo.OAuth2UserRequest;
import org.springframework.security.oauth2.core.OAuth2AuthenticationException;
import org.springframework.security.oauth2.core.user.OAuth2User;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
public class OAuth2UserService extends DefaultOAuth2UserService {

    private final UserRepository userRepository;

    @Autowired
    public OAuth2UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public OAuth2User loadUser(OAuth2UserRequest userRequest) throws OAuth2AuthenticationException {
        System.out.println("=== OAuth2UserService.loadUser called ===");
        System.out.println("Registration ID: " + userRequest.getClientRegistration().getRegistrationId());
        
        OAuth2User oauth2User = super.loadUser(userRequest);
        
        System.out.println("Default OAuth2User loaded: " + oauth2User);
        
        return processOAuth2User(userRequest, oauth2User);
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oauth2User) {
        System.out.println("=== OAuth2UserService.processOAuth2User called ===");
        
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());
        
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String picture = oauth2User.getAttribute("picture");
        String providerId = oauth2User.getAttribute("sub"); // Google's user ID
        
        System.out.println("Email: " + email);
        System.out.println("Name: " + name);
        System.out.println("Picture: " + picture);
        System.out.println("Provider ID: " + providerId);
        
        // Validate required fields
        if (email == null || email.trim().isEmpty()) {
            throw new OAuth2AuthenticationException("Email not provided by OAuth2 provider");
        }
        if (providerId == null || providerId.trim().isEmpty()) {
            throw new OAuth2AuthenticationException("Provider ID not provided by OAuth2 provider");
        }
        
        Optional<User> userOptional = userRepository.findByProviderAndProviderId(provider, providerId);
        User user;
        
        if (userOptional.isPresent()) {
            user = userOptional.get();
            // Update user info if needed
            user.setAvatarUrl(picture);
        } else {
            // Check if user exists with same email but different provider
            Optional<User> existingUser = userRepository.findByEmail(email);
            if (existingUser.isPresent()) {
                user = existingUser.get();
                // Link the OAuth2 account
                user.setProvider(provider);
                user.setProviderId(providerId);
                user.setAvatarUrl(picture);
            } else {
                // Create new user
                user = new User();
                user.setEmail(email);
                String baseUsername = email.split("@")[0];
                // Ensure username meets minimum length requirement
                if (baseUsername.length() < 3) {
                    baseUsername = baseUsername + "_user";
                }
                
                // Handle duplicate usernames by appending a number
                String uniqueUsername = baseUsername;
                int counter = 1;
                while (userRepository.findByUsername(uniqueUsername).isPresent()) {
                    uniqueUsername = baseUsername + "_" + counter;
                    counter++;
                }
                user.setUsername(uniqueUsername);
                user.setFirstName(name != null ? name.split(" ")[0] : null);
                user.setLastName(name != null && name.split(" ").length > 1 ? name.split(" ")[1] : null);
                user.setAvatarUrl(picture);
                user.setProvider(provider);
                user.setProviderId(providerId);
                user.setEmailVerified(true); // OAuth2 emails are considered verified
                user.setPassword("OAUTH2_USER_NO_PASSWORD"); // Placeholder for OAuth2 users
            }
        }
        
        try {
            userRepository.save(user);
        } catch (Exception e) {
            throw new OAuth2AuthenticationException("Failed to save user: " + e.getMessage());
        }
        
        return new CustomOAuth2User(oauth2User, user);
    }
}