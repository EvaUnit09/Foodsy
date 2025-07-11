package com.foodsy.controller;

import com.foodsy.domain.User;
import com.foodsy.dto.UserDto;
import com.foodsy.service.CustomOAuth2User;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/oauth2")
@CrossOrigin(origins = "http://localhost:3000")
public class OAuth2Controller {

    @GetMapping("/user")
    public ResponseEntity<UserDto> getCurrentOAuth2User(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof CustomOAuth2User) {
            CustomOAuth2User oauth2User = (CustomOAuth2User) authentication.getPrincipal();
            User user = oauth2User.getUser();
            
            UserDto userDto = convertToDto(user);
            return ResponseEntity.ok(userDto);
        }
        
        return ResponseEntity.notFound().build();
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