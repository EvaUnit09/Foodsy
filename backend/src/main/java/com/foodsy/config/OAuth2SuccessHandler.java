package com.foodsy.config;

import com.foodsy.domain.User;
import com.foodsy.service.CustomOAuth2User;
import com.foodsy.service.JwtService;
import com.foodsy.util.CookieUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
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
        System.out.println("Principal type: " + authentication.getPrincipal().getClass().getSimpleName());
        
        try {
            String email;
            String username;
            String displayName;
            
            // Handle both CustomOAuth2User and DefaultOidcUser
            if (authentication.getPrincipal() instanceof CustomOAuth2User) {
                System.out.println("Handling CustomOAuth2User");
                CustomOAuth2User oauth2User = (CustomOAuth2User) authentication.getPrincipal();
                User user = oauth2User.getUser();
                
                System.out.println("OAuth2User: " + oauth2User);
                System.out.println("User: " + user);
                System.out.println("User email: " + user.getEmail());
                System.out.println("User name: " + user.getUsername());
                System.out.println("User first name: " + user.getFirstName());
                System.out.println("User last name: " + user.getLastName());
                
                email = user.getEmail();
                username = user.getUsername();
                displayName = user.getFirstName() != null ? user.getFirstName() : user.getUsername();
                
            } else if (authentication.getPrincipal() instanceof DefaultOidcUser) {
                System.out.println("Handling DefaultOidcUser");
                DefaultOidcUser oidcUser = (DefaultOidcUser) authentication.getPrincipal();
                
                System.out.println("OidcUser: " + oidcUser);
                System.out.println("User email: " + oidcUser.getEmail());
                System.out.println("User name: " + oidcUser.getName());
                System.out.println("User given name: " + oidcUser.getGivenName());
                System.out.println("User family name: " + oidcUser.getFamilyName());
                System.out.println("User subject: " + oidcUser.getSubject());
                
                email = oidcUser.getEmail();
                username = oidcUser.getSubject(); // Use Google ID as username
                displayName = oidcUser.getGivenName() != null ? oidcUser.getGivenName() : oidcUser.getName();
                
            } else {
                throw new RuntimeException("Unsupported principal type: " + authentication.getPrincipal().getClass().getName());
            }
            
            // Generate JWT tokens using the username
            String accessToken = jwtService.generateAccessToken(username, email);
            String refreshToken = jwtService.generateRefreshToken(username);
            
            System.out.println("Generated access token: " + accessToken.substring(0, Math.min(20, accessToken.length())) + "...");
            System.out.println("Generated refresh token: " + refreshToken.substring(0, Math.min(20, refreshToken.length())) + "...");
            
            // Set refresh token as HttpOnly cookie (more secure)
            cookieUtil.setRefreshTokenCookie(response, refreshToken);
            
            // Pass access token as URL parameter for immediate use
            String redirectUrl = String.format(
                "https://foodsy-frontend.vercel.app/auth/oauth2/success?username=%s&accessToken=%s",
                URLEncoder.encode(displayName, StandardCharsets.UTF_8),
                URLEncoder.encode(accessToken, StandardCharsets.UTF_8)
            );
            
            System.out.println("Redirecting to: " + redirectUrl);
            
            // Log success for debugging
            System.out.println("OAuth2 authentication successful for user: " + email);
            
            response.sendRedirect(redirectUrl);
            
        } catch (Exception e) {
            System.err.println("Error in OAuth2 success handler: " + e.getMessage());
            e.printStackTrace();
            response.sendRedirect("https://foodsy-frontend.vercel.app/auth/error?message=token_generation_failed");
        }
    }
}
