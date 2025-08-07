package com.foodsy.util;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

/**
 * Utility class for cookie management
 * Eliminates duplication in cookie creation and configuration
 */
@Component
public class CookieUtil {
    
    @Value("${app.cookie.secure:false}")
    private boolean secure;
    
    @Value("${app.cookie.domain:}")
    private String domain;
    
    // Cookie duration constants (in seconds)
    public static final int ACCESS_TOKEN_DURATION = 24 * 60 * 60; // 24 hours
    public static final int REFRESH_TOKEN_DURATION = 7 * 24 * 60 * 60; // 7 days
    public static final int SESSION_DURATION = 30 * 60; // 30 minutes
    
    /**
     * Create and set a cookie with the specified parameters
     */
    public static void setCookie(HttpServletResponse response, String name, String value, int maxAge) {
        setCookie(response, name, value, maxAge, "/", false, true);
    }
    
    /**
     * Create and set a cookie with full configuration options
     */
    public static void setCookie(HttpServletResponse response, String name, String value, int maxAge, 
                                String path, boolean secure, boolean httpOnly) {
        Cookie cookie = new Cookie(name, value);
        cookie.setMaxAge(maxAge);
        cookie.setPath(path);
        cookie.setSecure(secure);
        cookie.setHttpOnly(httpOnly);
        response.addCookie(cookie);
    }
    
    /**
     * Set an HTTP-only access token cookie
     */
    public void setAccessTokenCookie(HttpServletResponse response, String accessToken) {
        // Use Set-Cookie header directly for full control over cross-domain attributes
        // Domain is left empty to allow cross-domain usage between Vercel and backend
        response.addHeader("Set-Cookie", 
            String.format("accessToken=%s; Max-Age=%d; Path=/; Secure; HttpOnly; SameSite=None", 
                accessToken, ACCESS_TOKEN_DURATION));
    }
    
    /**
     * Set an HTTP-only refresh token cookie
     */
    public void setRefreshTokenCookie(HttpServletResponse response, String refreshToken) {
        // Use Set-Cookie header directly for full control over cross-domain attributes
        // Domain is left empty to allow cross-domain usage between Vercel and backend
        response.addHeader("Set-Cookie", 
            String.format("refreshToken=%s; Max-Age=%d; Path=/; Secure; HttpOnly; SameSite=None", 
                refreshToken, REFRESH_TOKEN_DURATION));
    }
    
    /**
     * Set a session cookie (expires when browser closes)
     */
    public void setSessionCookie(HttpServletResponse response, String name, String value) {
        setCookie(response, name, value, -1, "/", secure, false);
    }
    
    /**
     * Clear a cookie by setting its max age to 0
     */
    public static void clearCookie(HttpServletResponse response, String name) {
        clearCookie(response, name, "/");
    }
    
    /**
     * Clear a cookie with specific path
     */
    public static void clearCookie(HttpServletResponse response, String name, String path) {
        Cookie cookie = new Cookie(name, "");
        cookie.setMaxAge(0);
        cookie.setPath(path);
        response.addCookie(cookie);
    }
    
    /**
     * Clear access token cookie
     */
    public void clearAccessTokenCookie(HttpServletResponse response) {
        clearCookie(response, "accessToken");
    }
    
    /**
     * Clear refresh token cookie
     */
    public void clearRefreshTokenCookie(HttpServletResponse response) {
        clearCookie(response, "refreshToken");
    }
    
    /**
     * Clear all authentication cookies
     */
    public void clearAuthCookies(HttpServletResponse response) {
        clearAccessTokenCookie(response);
        clearRefreshTokenCookie(response);
    }
}