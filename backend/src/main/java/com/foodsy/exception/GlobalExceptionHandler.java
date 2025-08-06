package com.foodsy.exception;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.Map;

/**
 * Global exception handler to eliminate try-catch duplication across controllers
 * Provides consistent error responses and logging
 */
@ControllerAdvice
public class GlobalExceptionHandler {
    
    private static final Logger logger = LoggerFactory.getLogger(GlobalExceptionHandler.class);
    
    /**
     * Handle ResponseStatusException (thrown by controllers)
     */
    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ErrorResponse> handleResponseStatusException(ResponseStatusException e) {
        logger.warn("ResponseStatusException: {} - {}", e.getStatusCode(), e.getReason());
        return ResponseEntity.status(e.getStatusCode())
            .body(new ErrorResponse(e.getReason()));
    }
    
    /**
     * Handle validation errors from @Valid annotations
     */
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ValidationErrorResponse> handleValidationException(MethodArgumentNotValidException e) {
        Map<String, String> errors = new HashMap<>();
        e.getBindingResult().getAllErrors().forEach((error) -> {
            String fieldName = ((FieldError) error).getField();
            String errorMessage = error.getDefaultMessage();
            errors.put(fieldName, errorMessage);
        });
        
        logger.warn("Validation error: {}", errors);
        return ResponseEntity.badRequest()
            .body(new ValidationErrorResponse("Validation failed", errors));
    }
    
    /**
     * Handle IllegalArgumentException
     */
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ErrorResponse> handleIllegalArgumentException(IllegalArgumentException e) {
        logger.warn("IllegalArgumentException: {}", e.getMessage());
        return ResponseEntity.badRequest()
            .body(new ErrorResponse(e.getMessage()));
    }
    
    /**
     * Handle SecurityException (authentication/authorization issues)
     */
    @ExceptionHandler(SecurityException.class)
    public ResponseEntity<ErrorResponse> handleSecurityException(SecurityException e) {
        logger.warn("SecurityException: {}", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN)
            .body(new ErrorResponse(e.getMessage()));
    }
    
    /**
     * Handle custom business logic exceptions
     */
    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ErrorResponse> handleBusinessException(BusinessException e) {
        logger.warn("BusinessException: {}", e.getMessage());
        return ResponseEntity.status(e.getStatusCode())
            .body(new ErrorResponse(e.getMessage()));
    }
    


    /**
     * Handle all other unexpected exceptions
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<ErrorResponse> handleGenericException(Exception e) {
        logger.error("Unexpected error occurred", e);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
            .body(new ErrorResponse("An unexpected error occurred. Please try again later."));
    }
    
    /**
     * Standard error response structure
     */
    public static class ErrorResponse {
        private final String message;
        private final long timestamp;
        
        public ErrorResponse(String message) {
            this.message = message;
            this.timestamp = System.currentTimeMillis();
        }
        
        public String getMessage() {
            return message;
        }
        
        public long getTimestamp() {
            return timestamp;
        }
    }
    
    /**
     * Validation error response with field-specific errors
     */
    public static class ValidationErrorResponse {
        private final String message;
        private final Map<String, String> fieldErrors;
        private final long timestamp;
        
        public ValidationErrorResponse(String message, Map<String, String> fieldErrors) {
            this.message = message;
            this.fieldErrors = fieldErrors;
            this.timestamp = System.currentTimeMillis();
        }
        
        public String getMessage() {
            return message;
        }
        
        public Map<String, String> getFieldErrors() {
            return fieldErrors;
        }
        
        public long getTimestamp() {
            return timestamp;
        }
    }
}