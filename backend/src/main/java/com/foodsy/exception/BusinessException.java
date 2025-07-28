package com.foodsy.exception;

import org.springframework.http.HttpStatus;

/**
 * Custom exception for business logic violations
 * Allows controllers to throw specific business errors without try-catch blocks
 */
public class BusinessException extends RuntimeException {
    
    private final HttpStatus statusCode;
    
    public BusinessException(String message) {
        this(message, HttpStatus.BAD_REQUEST);
    }
    
    public BusinessException(String message, HttpStatus statusCode) {
        super(message);
        this.statusCode = statusCode;
    }
    
    public BusinessException(String message, Throwable cause) {
        this(message, HttpStatus.BAD_REQUEST, cause);
    }
    
    public BusinessException(String message, HttpStatus statusCode, Throwable cause) {
        super(message, cause);
        this.statusCode = statusCode;
    }
    
    public HttpStatus getStatusCode() {
        return statusCode;
    }
}