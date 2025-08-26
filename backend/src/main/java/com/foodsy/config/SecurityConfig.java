package com.foodsy.config;

import com.foodsy.service.JwtService;
import com.foodsy.service.OAuth2UserService;
import com.foodsy.util.CookieUtil;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;
import org.springframework.lang.NonNull;

/**
 * Consolidated Spring-Security configuration without Lombok.
 */
@Configuration
public class SecurityConfig {

    private final OAuth2UserService oAuth2UserService;
    private final JwtService jwtService;
    private final CookieUtil cookieUtil;
    private final com.foodsy.service.UserService userService;
    private final ApiAuthenticationEntryPoint apiAuthenticationEntryPoint;

    // Constructor injection – no Lombok required
    public SecurityConfig(OAuth2UserService oAuth2UserService,
                          JwtService jwtService,
                          CookieUtil cookieUtil,
                          com.foodsy.service.UserService userService,
                          ApiAuthenticationEntryPoint apiAuthenticationEntryPoint) {
        this.oAuth2UserService = oAuth2UserService;
        this.jwtService = jwtService;
        this.cookieUtil = cookieUtil;
        this.userService = userService;
        this.apiAuthenticationEntryPoint = apiAuthenticationEntryPoint;
    }

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http
            .csrf(AbstractHttpConfigurer::disable)
            .cors(Customizer.withDefaults()) // delegate to WebMvcConfigurer
            .sessionManagement(s -> s.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED))
            .authorizeHttpRequests(auth -> auth
                    .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
                    .requestMatchers("/", "/error", "/oauth2/**", "/auth/**", "/css/**", "/js/**", "/images/**", "/webjars/**", "/favicon.ico", "/actuator/**").permitAll()
                    // Allow public GET access for restaurant photos and search (binary image proxy etc.)
                    .requestMatchers(HttpMethod.GET, "/restaurants/**").permitAll()
                    // Allow public access to admin endpoints for population scripts
                    .requestMatchers(HttpMethod.POST, "/homepage/refresh/**", "/homepage/trending/update/**").permitAll()
                    .requestMatchers(HttpMethod.GET, "/homepage/health", "/homepage/trending/stats/**").permitAll()
                    .anyRequest().authenticated())
            .formLogin(AbstractHttpConfigurer::disable)
            .httpBasic(AbstractHttpConfigurer::disable)
            .exceptionHandling(exceptions -> exceptions
                    .authenticationEntryPoint(apiAuthenticationEntryPoint)
            )
            .addFilterBefore(new JwtAuthenticationFilter(jwtService), UsernamePasswordAuthenticationFilter.class)
            .oauth2Login(oauth2 -> oauth2
                    .userInfoEndpoint(u -> u.userService(oAuth2UserService))
                    .successHandler(new OAuth2SuccessHandler(jwtService, cookieUtil, userService))
            );

        return http.build();
    }

    /**
     * Single source of truth for CORS.
     */
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(@NonNull CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("https://foodsy-frontend.vercel.app", "http://localhost:3000")
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
