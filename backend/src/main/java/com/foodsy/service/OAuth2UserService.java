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
        OAuth2User oauth2User = super.loadUser(userRequest);
        
        return processOAuth2User(userRequest, oauth2User);
    }

    private OAuth2User processOAuth2User(OAuth2UserRequest userRequest, OAuth2User oauth2User) {
        String registrationId = userRequest.getClientRegistration().getRegistrationId();
        AuthProvider provider = AuthProvider.valueOf(registrationId.toUpperCase());
        
        String email = oauth2User.getAttribute("email");
        String name = oauth2User.getAttribute("name");
        String picture = oauth2User.getAttribute("picture");
        String providerId = oauth2User.getAttribute("sub"); // Google's user ID
        
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
                user.setUsername(email.split("@")[0]); // Use email prefix as username
                user.setFirstName(name != null ? name.split(" ")[0] : null);
                user.setLastName(name != null && name.split(" ").length > 1 ? name.split(" ")[1] : null);
                user.setAvatarUrl(picture);
                user.setProvider(provider);
                user.setProviderId(providerId);
                user.setEmailVerified(true); // OAuth2 emails are considered verified
                user.setPassword(""); // No password for OAuth2 users
            }
        }
        
        userRepository.save(user);
        
        return new CustomOAuth2User(oauth2User, user);
    }
}