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
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;

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
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOriginPatterns(Arrays.asList("*")); // More permissive for development
        config.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        config.setAllowedHeaders(Arrays.asList("*"));
        config.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", config);
        return source;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        System.out.println("Configuring SecurityFilterChain...");
        
        http
            .cors(cors -> cors.configurationSource(corsConfigurationSource()))
            .csrf(AbstractHttpConfigurer::disable)
            .sessionManagement(session -> {
                System.out.println("Configuring session management with IF_REQUIRED policy");
                session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED);
            })
            .authorizeHttpRequests(auth -> {
                System.out.println("Configuring authorization rules...");
                auth.requestMatchers("/", "/error", "/oauth2/**", "/login/**", "/auth/**").permitAll()
                    .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**").permitAll()
                    .requestMatchers("/favicon.ico").denyAll()
                    .anyRequest().authenticated();
                System.out.println("Authorization rules configured");
            })
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
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
}
