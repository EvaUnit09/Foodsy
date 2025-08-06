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
            .sessionManagement(session -> {
                System.out.println("Configuring session management with IF_REQUIRED policy");
                session.sessionCreationPolicy(SessionCreationPolicy.IF_REQUIRED);
            })
            .authorizeHttpRequests(auth -> {
                System.out.println("Configuring authorization rules...");
                auth.requestMatchers("/", "/error", "/oauth2/**", "/login/**", "/auth/login", "/auth/signup", "/auth/logout").permitAll()
                    .requestMatchers("/css/**", "/js/**", "/images/**", "/webjars/**").permitAll()
                    .requestMatchers("/favicon.ico").denyAll()
                    .anyRequest().authenticated();
                System.out.println("Authorization rules configured");
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
}
