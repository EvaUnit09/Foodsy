package com.foodsy.controller;

import com.foodsy.dto.UserDto;
import com.foodsy.service.UserService;
import com.foodsy.util.UserMapper;
import com.foodsy.util.CookieUtil;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Optional;
import java.security.Principal;
import com.foodsy.domain.User;

@RestController
@RequestMapping("/auth")
public class AuthController {
    
    private final UserService userService;
    private final CookieUtil cookieUtil;
    
    @Autowired
    public AuthController(UserService userService, CookieUtil cookieUtil) {
        this.userService = userService;
        this.cookieUtil = cookieUtil;
    }
    
    @GetMapping("/me")
    public ResponseEntity<UserDto> getCurrentUser(Principal principal) {
        if (principal == null) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).build();
        }
        
        try {
            Optional<User> userOptional = userService.findByUsername(principal.getName());
            
            if (userOptional.isEmpty()) {
                return ResponseEntity.notFound().build();
            }
            
            UserDto userDto = UserMapper.toDto(userOptional.get());
            return ResponseEntity.ok(userDto);
            
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        // Clear cookies
        cookieUtil.clearAuthCookies(response);
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }
}