package com.foodsy.controller;

import com.foodsy.dto.UserDto;
import com.foodsy.service.UserService;
import com.foodsy.util.UserMapper;
import com.foodsy.util.CookieUtil;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.Cookie;
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
        System.out.println("AuthController - /auth/me called with principal: " + (principal != null ? principal.getName() : "null"));
        
        if (principal == null) {
            System.out.println("AuthController - No principal found, returning 401");
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
    
    @GetMapping("/test")
    public ResponseEntity<Map<String, Object>> testAuth(HttpServletRequest request, Principal principal) {
        System.out.println("AuthController - /auth/test called");
        
        // Log all cookies
        Cookie[] cookies = request.getCookies();
        if (cookies != null) {
            System.out.println("AuthController - Found " + cookies.length + " cookies in /auth/test:");
            for (Cookie cookie : cookies) {
                System.out.println("AuthController - Cookie: " + cookie.getName() + " = " + (cookie.getValue() != null ? cookie.getValue().substring(0, Math.min(20, cookie.getValue().length())) + "..." : "null"));
            }
        } else {
            System.out.println("AuthController - No cookies found in /auth/test");
        }
        
        return ResponseEntity.ok(Map.of(
            "message", "Test endpoint working",
            "principal", principal != null ? principal.getName() : "null",
            "cookieCount", cookies != null ? cookies.length : 0
        ));
    }
    
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        // Clear cookies
        cookieUtil.clearAuthCookies(response);
        return ResponseEntity.ok(Map.of("message", "Logout successful"));
    }
}