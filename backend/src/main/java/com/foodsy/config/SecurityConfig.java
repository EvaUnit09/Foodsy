package com.foodsy.config;

import com.foodsy.service.JwtService;
import com.foodsy.service.OAuth2UserService;
import com.foodsy.util.CookieUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
public class SecurityConfig {

    private final OAuth2UserService oAuth2UserService;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;

    @Autowired
    public SecurityConfig(OAuth2UserService oAuth2UserService,
                          JwtService jwtService,
                          CookieUtil cookieUtil) {
        this.oAuth2UserService = oAuth2UserService;
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
        
        System.out.println("SecurityConfig initialized with OAuth2UserService: " + oAuth2UserService);
        System.out.println("SecurityConfig initialized with JwtService: " + jwtService);
        System.out.println("SecurityConfig initialized with CookieUtil: " + cookieUtil);
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        System.out.println("Configuring SecurityFilterChain...");
        
        http
            .csrf(AbstractHttpConfigurer::disable)
            // Enable CORS with custom configuration for OAuth2
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .sessionManagement(session -> {
                System.out.println("Configuring session management with IF_REQUIRED policy");
                session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED);
            })
            .authorizeHttpRequests(auth -> {
                System.out.println("Configuring authorization rules...");
                auth
                    // CRITICAL: Permit ALL OPTIONS requests first (for CORS preflight)
                    .requestMatchers("OPTIONS", "/**").permitAll()
                    // Public endpoints
                    .requestMatchers("/", "/error", "/oauth2/**", "/login/**", "/auth/login", "/auth/signup", "/auth/logout").permitAll()
                    .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**").permitAll()
                    .requestMatchers("/favicon.ico").denyAll()
                    .anyRequest().authenticated();
                System.out.println("Authorization rules configured with OPTIONS permit");
            })
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .addFilterBefore(new JwtAuthenticationFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
            .oauth2Login(oauth2 -> {
                System.out.println("Configuring OAuth2 login with defaults...");
                oauth2
                    .userInfoEndpoint(userInfo -> {
                        System.out.println("Configuring userInfo endpoint with: " + oAuth2UserService);
                        userInfo.userService(oAuth2UserService);
                    })
                    .successHandler(new OAuth2SuccessHandler(jwtService, cookieUtil));
                System.out.println("OAuth2 login configured successfully");
            });
        
        System.out.println("SecurityFilterChain configuration completed");
        return http.build();
    }
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        System.out.println("Configuring CORS for OAuth2 and API endpoints...");
        
        CorsConfiguration configuration = new CorsConfiguration();
        
        // Allow specific origins
        configuration.setAllowedOrigins(Arrays.asList(
            "https://foodsy-frontend.vercel.app",
            "http://localhost:3000" // For development
        ));
        
        // Allow credentials (required for cookies)
        configuration.setAllowCredentials(true);
        
        // Allow all standard HTTP methods
        configuration.setAllowedMethods(Arrays.asList(
            "GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD", "PATCH"
        ));
        
        // Allow all standard headers plus OAuth2 specific ones
        configuration.setAllowedHeaders(Arrays.asList(
            "Origin",
            "X-Requested-With", 
            "Content-Type",
            "Accept",
            "Authorization",
            "Cookie",
            "Set-Cookie",
            "X-Forwarded-For",
            "X-Forwarded-Proto",
            "X-Forwarded-Host"
        ));
        
        // Expose headers that frontend might need
        configuration.setExposedHeaders(Arrays.asList(
            "Set-Cookie",
            "Authorization",
            "Location"
        ));
        
        // Cache preflight for 1 hour
        configuration.setMaxAge(3600L);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        
        // Apply CORS to all endpoints
        source.registerCorsConfiguration("/**", configuration);
        
        System.out.println("CORS configuration completed for all endpoints");
        return source;
    }
}
