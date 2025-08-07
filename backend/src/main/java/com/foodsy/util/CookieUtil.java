package com.foodsy.util;

import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Central place for creating, rotating and clearing authentication cookies.
 * <ul>
 *   <li>Uses <code>Secure</code> and <code>SameSite=None</code> for cross‑origin cookies</li>
 *   <li>Provides helpers for access‑token, refresh‑token and session cookies.</li>
 *   <li>Convenience methods to clear individual or all auth cookies.</li>
 * </ul>
 */
@Component
public class CookieUtil {

    private static final Duration ACCESS_TOKEN_TTL = Duration.ofHours(24);
    private static final Duration REFRESH_TOKEN_TTL = Duration.ofDays(7);

    /* ======================================================== */
    /*  Public helpers                                          */
    /* ======================================================== */

    public void setAccessTokenCookie(HttpServletResponse res, String token) {
        setCookie(res, "accessToken", token, ACCESS_TOKEN_TTL);
    }

    public void setRefreshTokenCookie(HttpServletResponse res, String token) {
        setCookie(res, "refreshToken", token, REFRESH_TOKEN_TTL);
    }

    /** Browser‑session cookie (no Max‑Age) */
    public void setSessionCookie(HttpServletResponse res, String name, String value) {
        ResponseCookie cookie = base(name, value)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    public void clearAccessTokenCookie(HttpServletResponse res) {
        expireCookie(res, "accessToken");
    }

    public void clearRefreshTokenCookie(HttpServletResponse res) {
        expireCookie(res, "refreshToken");
    }

    public void clearAuthCookies(HttpServletResponse res) {
        clearAccessTokenCookie(res);
        clearRefreshTokenCookie(res);
    }

    /* ======================================================== */
    /*  Internal helpers                                        */
    /* ======================================================== */

    private void setCookie(HttpServletResponse res, String name, String value, Duration ttl) {
        ResponseCookie cookie = base(name, value)
                .maxAge(ttl)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private void expireCookie(HttpServletResponse res, String name) {
        ResponseCookie cookie = base(name, "")
                .maxAge(Duration.ZERO)
                .build();
        res.addHeader(HttpHeaders.SET_COOKIE, cookie.toString());
    }

    private ResponseCookie.ResponseCookieBuilder base(String name, String value) {
        return ResponseCookie.from(name, value)
                .path("/")
                .httpOnly(true)
                .secure(true) // required with SameSite=None
                .sameSite("None");
    }
}
