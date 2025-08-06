package com.foodsy.config;

import com.foodsy.domain.User;
import com.foodsy.service.CustomOAuth2User;
import com.foodsy.service.JwtService;

import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {
    
    private final JwtService jwtService;
    
    public OAuth2SuccessHandler(JwtService jwtService) {
        this.jwtService = jwtService;
    }
    
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, 
                                       HttpServletResponse response, 
                                       Authentication authentication) throws IOException, ServletException {
        
        try {
            CustomOAuth2User oauth2User = (CustomOAuth2User) authentication.getPrincipal();
            User user = oauth2User.getUser();
            
            // Generate JWT tokens
            String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getEmail());
            String refreshToken = jwtService.generateRefreshToken(user.getUsername());
            
            // Since we can't use cross-domain cookies, we'll pass tokens as URL parameters
            // The frontend will need to extract these and store them
            String redirectUrl = String.format(
                "https://foodsy-frontend.vercel.app/auth/oauth2/callback?accessToken=%s&refreshToken=%s&username=%s",
                URLEncoder.encode(accessToken, StandardCharsets.UTF_8),
                URLEncoder.encode(refreshToken, StandardCharsets.UTF_8),
                URLEncoder.encode(user.getUsername(), StandardCharsets.UTF_8)
            );
            
            // Log success for debugging
            System.out.println("OAuth2 authentication successful for user: " + user.getEmail());
            
            response.sendRedirect(redirectUrl);
            
        } catch (Exception e) {
            System.err.println("Error in OAuth2 success handler: " + e.getMessage());
            e.printStackTrace();
            response.sendRedirect("https://foodsy-frontend.vercel.app/auth/error?message=token_generation_failed");
        }
    }
}