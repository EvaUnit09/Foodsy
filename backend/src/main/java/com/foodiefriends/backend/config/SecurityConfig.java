package com.foodiefriends.backend.config;

import com.foodiefriends.backend.service.OAuth2UserService;
import com.foodiefriends.backend.security.JwtAuthenticationFilter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;

@Configuration
public class SecurityConfig {
    
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
    
    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration configuration = new CorsConfiguration();
        configuration.setAllowedOrigins(Arrays.asList("http://localhost:3000", "https://localhost:3000"));
        configuration.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        configuration.setAllowedHeaders(Arrays.asList("*"));
        configuration.setAllowCredentials(true);
        
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", configuration);
        return source;
    }
    
    @Bean
    public AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, authException) -> {
            response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
            response.setContentType("application/json");
            response.getWriter().write("{\"error\":\"Unauthorized\",\"message\":\"Authentication required\"}");
        };
    }
    
    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .csrf(AbstractHttpConfigurer::disable)
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
                .authorizeHttpRequests(auth -> auth
                    // Allow all OPTIONS requests (CORS preflight)
                    .requestMatchers(org.springframework.http.HttpMethod.OPTIONS, "/**").permitAll()
                    // Public endpoints
                    .requestMatchers("/api/auth/**").permitAll()
                    .requestMatchers("/ws/**").permitAll()
                    .requestMatchers("/api/hello").permitAll()
                    // Restaurant photos should be public
                    .requestMatchers("/api/restaurants/*/photos").permitAll()
                    .requestMatchers("/api/restaurants/photos/**").permitAll()
                    // Temporarily disable OAuth2 endpoints
                    // .requestMatchers("/oauth2/**").permitAll()
                    // .requestMatchers("/login/oauth2/**").permitAll()
                    // Session viewing is public, but voting requires authentication
                    .requestMatchers("/api/sessions/*/restaurants").permitAll()
                    .requestMatchers("/api/sessions/*/participants").permitAll()
                    .requestMatchers("/api/sessions/*/voting-status").permitAll()
                    .requestMatchers("/api/sessions/{sessionId}").permitAll()
                    // Session creation and voting requires authentication
                    .requestMatchers("/api/sessions").authenticated()
                    .requestMatchers("/api/sessions/*/restaurants/*/vote").authenticated()
                    .requestMatchers("/api/sessions/*/remaining-votes").authenticated()
                    // All other requests require authentication
                    .anyRequest().authenticated()
                )
                // Disable OAuth2 login for now - using JWT authentication only
                // .oauth2Login(oauth2 -> oauth2
                //     .authorizationEndpoint(authorization -> authorization
                //         .baseUri("/oauth2/authorization"))
                //     .redirectionEndpoint(redirection -> redirection
                //         .baseUri("/login/oauth2/code/*"))
                //     .userInfoEndpoint(userInfo -> userInfo
                //         .userService(oauth2UserService))
                //     .successHandler((request, response, authentication) -> {
                //         // Redirect to frontend after successful OAuth2 login
                //         response.sendRedirect("http://localhost:3000/auth/oauth2/success");
                //     })
                // )
                .exceptionHandling(ex -> ex.authenticationEntryPoint(authenticationEntryPoint()))
                .httpBasic(AbstractHttpConfigurer::disable)
                .formLogin(AbstractHttpConfigurer::disable);
        return http.build();
    }
    @Configuration
    public static class WebConfig implements WebMvcConfigurer {

        @Override
        public void addCorsMappings(@NonNull CorsRegistry registry) {
            registry.addMapping("/api/**")
                    .allowedOrigins("http://localhost:3000", "https://localhost:3000")
                    .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                    .allowedHeaders("*")
                    .allowCredentials(true);
        }
    }

}
