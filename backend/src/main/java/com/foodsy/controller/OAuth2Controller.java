package com.foodsy.controller;

import com.foodsy.domain.User;
import com.foodsy.dto.UserDto;
import com.foodsy.service.CustomOAuth2User;
import com.foodsy.util.UserMapper;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/oauth2")
// @CrossOrigin removed - CORS handled by Nginx
public class OAuth2Controller {

    @GetMapping("/user")
    public ResponseEntity<UserDto> getCurrentOAuth2User(HttpServletRequest request) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication != null && authentication.getPrincipal() instanceof CustomOAuth2User) {
            CustomOAuth2User oauth2User = (CustomOAuth2User) authentication.getPrincipal();
            User user = oauth2User.getUser();
            
            UserDto userDto = UserMapper.toDto(user);
            return ResponseEntity.ok(userDto);
        }
        
        return ResponseEntity.notFound().build();
    }

}