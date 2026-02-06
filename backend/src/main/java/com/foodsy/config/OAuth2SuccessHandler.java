package com.foodsy.config;

import com.foodsy.domain.User;
import com.foodsy.domain.AuthProvider;
import com.foodsy.service.CustomOAuth2User;
import com.foodsy.service.JwtService;
import com.foodsy.service.UserService;
import com.foodsy.util.CookieUtil;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.core.oidc.user.DefaultOidcUser;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

public class OAuth2SuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    private static final Logger logger = LoggerFactory.getLogger(OAuth2SuccessHandler.class);
    
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final UserService userService;
    
    public OAuth2SuccessHandler(JwtService jwtService, CookieUtil cookieUtil, UserService userService) {
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
        this.userService = userService;
    }
    
    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, 
                                       HttpServletResponse response, 
                                       Authentication authentication) throws IOException, ServletException {
        
        logger.debug("OAuth2SuccessHandler.onAuthenticationSuccess called");
        logger.debug("Request URI: {}", request.getRequestURI());
        logger.debug("Authentication: {}", authentication);
        logger.debug("Principal type: {}", authentication.getPrincipal().getClass().getSimpleName());
        
        try {
            String email;
            String username;
            String displayName;
            
            // Handle both CustomOAuth2User and DefaultOidcUser
            if (authentication.getPrincipal() instanceof CustomOAuth2User) {
                logger.debug("Handling CustomOAuth2User");
                CustomOAuth2User oauth2User = (CustomOAuth2User) authentication.getPrincipal();
                User user = oauth2User.getUser();

                logger.debug("OAuth2User: {}", oauth2User);
                logger.debug("User: {}", user);
                logger.debug("User email: {}", user.getEmail());
                logger.debug("User name: {}", user.getUsername());
                logger.debug("User first name: {}", user.getFirstName());
                logger.debug("User last name: {}", user.getLastName());
                
                email = user.getEmail();
                username = user.getUsername();
                displayName = user.getFirstName() != null ? user.getFirstName() : user.getUsername();
                
            } else if (authentication.getPrincipal() instanceof DefaultOidcUser) {
                logger.debug("Handling DefaultOidcUser");
                DefaultOidcUser oidcUser = (DefaultOidcUser) authentication.getPrincipal();

                logger.debug("OidcUser: {}", oidcUser);
                logger.debug("User email: {}", oidcUser.getEmail());
                logger.debug("User name: {}", oidcUser.getName());
                logger.debug("User given name: {}", oidcUser.getGivenName());
                logger.debug("User family name: {}", oidcUser.getFamilyName());
                logger.debug("User subject: {}", oidcUser.getSubject());
                
                email = oidcUser.getEmail();
                // FIXED: Get the actual username from the database, not the Google subject ID
                String baseUsername = email.split("@")[0];
                if (baseUsername.length() < 3) {
                    baseUsername = baseUsername + "_user";
                }
                username = baseUsername; // This should match what OAuth2UserService creates
                displayName = oidcUser.getGivenName() != null ? oidcUser.getGivenName() : oidcUser.getName();
                
                // CRITICAL FIX: Create user in database if OAuth2UserService wasn't called
                logger.info("Ensuring user exists in database...");
                try {
                    // Check if user already exists
                    if (userService.findByEmail(email).isEmpty()) {
                        // Create new user
                        User newUser = new User();
                        newUser.setEmail(email);
                        newUser.setUsername(username);
                        newUser.setFirstName(oidcUser.getGivenName());
                        newUser.setLastName(oidcUser.getFamilyName());
                        newUser.setDisplayName(displayName);
                        newUser.setAvatarUrl(oidcUser.getAttribute("picture"));
                        newUser.setProvider(AuthProvider.GOOGLE);
                        newUser.setProviderId(oidcUser.getSubject());
                        newUser.setEmailVerified(true);
                        newUser.setPassword("OAUTH2_USER"); // OAuth2 users don't use passwords
                        
                        userService.createUser(newUser);
                        logger.info("Created new user: {}", username);
                    } else {
                        logger.debug("User already exists: {}", username);
                    }
                } catch (Exception e) {
                    logger.error("Failed to create user: {}", e.getMessage(), e);
                }
                
            } else {
                throw new RuntimeException("Unsupported principal type: " + authentication.getPrincipal().getClass().getName());
            }
            
            // Resolve the FINAL persisted username to avoid mismatches (e.g. duplicates with suffixes)
            try {
                var dbUserOpt = userService.findByEmail(email);
                if (dbUserOpt.isPresent()) {
                    username = dbUserOpt.get().getUsername();
                }
            } catch (Exception ignored) {}

            // Generate JWT tokens using the persisted username
            String accessToken = jwtService.generateAccessToken(username, email);
            String refreshToken = jwtService.generateRefreshToken(username);
            
            logger.debug("Generated access token: {}...", accessToken.substring(0, Math.min(20, accessToken.length())));
            logger.debug("Generated refresh token: {}...", refreshToken.substring(0, Math.min(20, refreshToken.length())));
            
            // Set refresh token as HttpOnly cookie (more secure)
            cookieUtil.setRefreshTokenCookie(response, refreshToken);
            
            // Pass access token as URL parameter for immediate use
            String redirectUrl = String.format(
                "https://foodsy-frontend.vercel.app/auth/oauth2/success?username=%s&accessToken=%s",
                URLEncoder.encode(username, StandardCharsets.UTF_8),
                URLEncoder.encode(accessToken, StandardCharsets.UTF_8)
            );
            
            logger.debug("Redirecting to: {}", redirectUrl);

            // Log success for debugging
            logger.info("OAuth2 authentication successful for user: {}", email);
            
            response.sendRedirect(redirectUrl);
            
        } catch (Exception e) {
            logger.error("Error in OAuth2 success handler: {}", e.getMessage(), e);
            response.sendRedirect("https://foodsy-frontend.vercel.app/auth/error?message=token_generation_failed");
        }
    }
}
