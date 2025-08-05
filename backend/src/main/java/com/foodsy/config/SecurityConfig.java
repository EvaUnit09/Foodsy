package com.foodsy.config;

import com.foodsy.service.OAuth2UserService;
import com.foodsy.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.lang.NonNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.web.csrf.CookieCsrfTokenRepository;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.core.session.SessionRegistry;
import org.springframework.security.core.session.SessionRegistryImpl;
import org.springframework.security.oauth2.client.web.AuthorizationRequestRepository;
import org.springframework.security.oauth2.client.web.HttpSessionOAuth2AuthorizationRequestRepository;
import org.springframework.security.oauth2.core.endpoint.OAuth2AuthorizationRequest;

import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;

@Configuration
@EnableWebSecurity
public class SecurityConfig {
    
    private static final Logger logger = LoggerFactory.getLogger(SecurityConfig.class);
    
    private final OAuth2UserService oauth2UserService;
    private final JwtAuthenticationFilter jwtAuthenticationFilter;
    
    @Autowired
    public SecurityConfig(OAuth2UserService oauth2UserService, JwtAuthenticationFilter jwtAuthenticationFilter) {
        this.oauth2UserService = oauth2UserService;
        this.jwtAuthenticationFilter = jwtAuthenticationFilter;
    }
    
    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
    
    @Bean
    public AuthenticationManager authenticationManager(AuthenticationConfiguration config) throws Exception {
        return config.getAuthenticationManager();
    }
    
    // CORS configuration removed - handled by Nginx
    
    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
        };
    }
    
    @Bean
    public SessionRegistry sessionRegistry() {
        return new SessionRegistryImpl();
    }
    
    @Bean
    public AuthorizationRequestRepository<OAuth2AuthorizationRequest> authorizationRequestRepository() {
        return new HttpSessionOAuth2AuthorizationRequestRepository();
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                // CORS handled by Nginx
                .csrf(csrf -> csrf
                    .csrfTokenRepository(CookieCsrfTokenRepository.withHttpOnlyFalse())
                    .ignoringRequestMatchers("/api/**") // Disable CSRF for API endpoints but keep for OAuth2
                )
                // Configure OAuth2 login first
                .oauth2Login(oauth2 -> oauth2
                    .authorizationEndpoint(authorization -> authorization
                        .baseUri("/oauth2/authorization")
                        .authorizationRequestRepository(authorizationRequestRepository()))
                    .redirectionEndpoint(redirection -> redirection
                        .baseUri("/login/oauth2/code/*"))
                    .userInfoEndpoint(userInfo -> userInfo
                        .userService(oauth2UserService))
                    .successHandler((request, response, authentication) -> {
                        // Redirect to frontend after successful OAuth2 login
                        String frontendUrl = System.getenv("FRONTEND_URL");
                        if (frontendUrl == null || frontendUrl.isEmpty()) {
                            frontendUrl = "https://foodsy-frontend.vercel.app";
                        }
                        response.sendRedirect(frontendUrl + "/auth/oauth2/success");
                    })
                    .failureHandler((request, response, exception) -> {
                        // Log OAuth2 failure and redirect to error page
                        logger.error("OAuth2 authentication failed: " + exception.getMessage());
                        String frontendUrl = System.getenv("FRONTEND_URL");
                        if (frontendUrl == null || frontendUrl.isEmpty()) {
                            frontendUrl = "https://foodsy-frontend.vercel.app";
                        }
                        response.sendRedirect(frontendUrl + "/auth/signin?error=oauth2_failed");
                    })
                )
                // Configure other security settings after OAuth2
                .sessionManagement(session -> session
                    .sessionCreationPolicy(SessionCreationPolicy.ALWAYS)
                    .maximumSessions(10)
                    .maxSessionsPreventsLogin(false)
                    .sessionRegistry(sessionRegistry()))
                .authorizeHttpRequests(auth -> auth
                    .requestMatchers("/oauth2/**", "/login/oauth2/**", "/error").permitAll()
                    .anyRequest().permitAll())
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint()))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);
        return http.build();
    }
    // WebConfig removed - CORS handled by Nginx

}
