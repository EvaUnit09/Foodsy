package com.foodsy.config;

import com.foodsy.domain.User;
import com.foodsy.service.CustomOAuth2User;
import com.foodsy.service.JwtService;
import com.foodsy.util.CookieUtil;
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
    private final CookieUtil cookieUtil;
    
    public OAuth2SuccessHandler(JwtService jwtService, CookieUtil cookieUtil) {
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
    }
    
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, 
                                       HttpServletResponse response, 
                                       Authentication authentication) throws IOException, ServletException {
        
        System.out.println("=== OAuth2SuccessHandler.onAuthenticationSuccess called ===");
        System.out.println("Request URI: " + request.getRequestURI());
        System.out.println("Authentication: " + authentication);
        
        try {
            CustomOAuth2User oauth2User = (CustomOAuth2User) authentication.getPrincipal();
            User user = oauth2User.getUser();
            
            System.out.println("OAuth2User: " + oauth2User);
            System.out.println("User: " + user);
            System.out.println("User email: " + user.getEmail());
            System.out.println("User name: " + user.getUsername());
            System.out.println("User first name: " + user.getFirstName());
            System.out.println("User last name: " + user.getLastName());
            
            // Generate JWT tokens using the username
            String accessToken = jwtService.generateAccessToken(user.getUsername(), user.getEmail());
            String refreshToken = jwtService.generateRefreshToken(user.getUsername());
            
            System.out.println("Generated access token: " + accessToken.substring(0, Math.min(20, accessToken.length())) + "...");
            System.out.println("Generated refresh token: " + refreshToken.substring(0, Math.min(20, refreshToken.length())) + "...");
            
            // Set tokens in HTTP-only cookies
            cookieUtil.setAccessTokenCookie(response, accessToken);
            cookieUtil.setRefreshTokenCookie(response, refreshToken);
            
            // Redirect to a frontend page that can handle the post-login flow
            String displayName = user.getFirstName() != null ? user.getFirstName() : user.getUsername();
            String redirectUrl = String.format(
                "https://foodsy-frontend.vercel.app/auth/oauth2/success?username=%s",
                URLEncoder.encode(displayName, StandardCharsets.UTF_8)
            );
            
            System.out.println("Redirecting to: " + redirectUrl);
            
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
