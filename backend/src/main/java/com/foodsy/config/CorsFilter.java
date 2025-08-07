package com.foodsy.config;

import jakarta.servlet.*;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.io.IOException;

@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class CorsFilter implements Filter {

    @Override
    public void doFilter(ServletRequest req, ServletResponse res, FilterChain chain) throws IOException, ServletException {
        HttpServletRequest request = (HttpServletRequest) req;
        HttpServletResponse response = (HttpServletResponse) res;
        
        String origin = request.getHeader("Origin");
        
        // Allow specific origins
        if ("https://foodsy-frontend.vercel.app".equals(origin) || 
            "http://localhost:3000".equals(origin)) {
            response.setHeader("Access-Control-Allow-Origin", origin);
        }
        
        response.setHeader("Access-Control-Allow-Credentials", "true");
        response.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS, HEAD, PATCH");
        response.setHeader("Access-Control-Allow-Headers", 
            "Origin, X-Requested-With, Content-Type, Accept, Authorization, Cookie, Set-Cookie, " +
            "X-Forwarded-For, X-Forwarded-Proto, X-Forwarded-Host");
        response.setHeader("Access-Control-Expose-Headers", "Set-Cookie, Authorization, Location");
        response.setHeader("Access-Control-Max-Age", "3600");
        
        System.out.println("CORS Filter - Method: " + request.getMethod() + ", Origin: " + origin + ", URI: " + request.getRequestURI());
        
        // Handle preflight OPTIONS requests
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            System.out.println("Handling OPTIONS preflight request for: " + request.getRequestURI());
            response.setStatus(HttpServletResponse.SC_OK);
            return; // Don't continue the chain for OPTIONS requests
        }
        
        chain.doFilter(req, res);
    }
    
    @Override
    public void init(FilterConfig filterConfig) throws ServletException {
        System.out.println("High-priority CORS Filter initialized");
    }
    
    @Override
    public void destroy() {
        // Cleanup if needed
    }
}