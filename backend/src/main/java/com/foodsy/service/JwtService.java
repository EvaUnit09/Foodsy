package com.foodsy.service;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;

@Service
public class JwtService {
    
    private final SecretKey secretKey;
    private final long expirationHours;
    private final long refreshExpirationHours;
    
    public JwtService(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.expiration-hours:24}") long expirationHours,
            @Value("${jwt.refresh-expiration-hours:168}") long refreshExpirationHours) {
        
        if (secret.getBytes().length < 32) {
            throw new IllegalArgumentException("JWT secret key must be at least 32 bytes long");
        }
        
        this.secretKey = Keys.hmacShaKeyFor(secret.getBytes());
        this.expirationHours = expirationHours;
        this.refreshExpirationHours = refreshExpirationHours;
    }
    
    public String generateAccessToken(String userId, String email) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim("email", email)
                .claim("type", "access")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(expirationHours, ChronoUnit.HOURS)))
                .signWith(secretKey)
                .compact();
    }
    
    public String generateRefreshToken(String userId) {
        Instant now = Instant.now();
        return Jwts.builder()
                .subject(userId)
                .claim("type", "refresh")
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(refreshExpirationHours, ChronoUnit.HOURS)))
                .signWith(secretKey)
                .compact();
    }
    
    public Claims validateToken(String token) {
        try {
            return Jwts.parser()
                    .verifyWith(secretKey)
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (JwtException | IllegalArgumentException e) {
            throw new RuntimeException("Invalid JWT token", e);
        }
    }
    
    public String extractUserId(String token) {
        return validateToken(token).getSubject();
    }
    
    public String extractEmail(String token) {
        return validateToken(token).get("email", String.class);
    }
    
    public boolean isTokenExpired(String token) {
        try {
            Claims claims = validateToken(token);
            return claims.getExpiration().before(new Date());
        } catch (Exception e) {
            return true;
        }
    }
    
    public boolean isRefreshToken(String token) {
        try {
            Claims claims = validateToken(token);
            return "refresh".equals(claims.get("type", String.class));
        } catch (Exception e) {
            return false;
        }
    }
    
    public boolean isAccessToken(String token) {
        try {
            Claims claims = validateToken(token);
            return "access".equals(claims.get("type", String.class));
        } catch (Exception e) {
            return false;
        }
    }
}
