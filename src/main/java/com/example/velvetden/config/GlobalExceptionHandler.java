package com.example.velvetden.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.AuthenticationException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {
    
    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, String>> handleAuthenticationException(
            AuthenticationException e, 
            HttpServletRequest request,
            HttpServletResponse response) {
        
        // Check if response is already committed
        if (response.isCommitted()) {
            return null; // Don't try to write to committed response
        }
        
        Map<String, String> error = new HashMap<>();
        error.put("error", "Authentication failed");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(error);
    }
    
    @ExceptionHandler(AccessDeniedException.class)
    public ResponseEntity<Map<String, String>> handleAccessDeniedException(
            AccessDeniedException e,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        // Check if response is already committed
        if (response.isCommitted()) {
            return null; // Don't try to write to committed response
        }
        
        Map<String, String> error = new HashMap<>();
        error.put("error", "Access denied");
        error.put("message", e.getMessage());
        return ResponseEntity.status(HttpStatus.FORBIDDEN).body(error);
    }
    
    @ExceptionHandler(DataIntegrityViolationException.class)
    public ResponseEntity<Map<String, String>> handleDataIntegrityViolation(
            DataIntegrityViolationException e,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        if (response.isCommitted()) {
            return null;
        }
        
        Map<String, String> error = new HashMap<>();
        String message = e.getMessage();
        
        // Check if it's a unique constraint violation (duplicate email)
        if (message != null && (message.contains("UK_6DOTKOTT2KJSP8VW4D0M25FB7") || 
                                message.contains("EMAIL") || 
                                message.contains("23505"))) {
            error.put("error", "This email is already registered. Please use a different email or try logging in.");
        } else {
            error.put("error", "Data integrity violation. Please check your input.");
        }
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
    
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, String>> handleRuntimeException(
            RuntimeException e,
            HttpServletRequest request,
            HttpServletResponse response) {
        
        if (response.isCommitted()) {
            return null;
        }
        
        Map<String, String> error = new HashMap<>();
        String message = e.getMessage();
        
        if (message != null && message.contains("already registered")) {
            error.put("error", "This email is already registered. Please use a different email or try logging in.");
        } else {
            error.put("error", message != null ? message : "An error occurred. Please try again.");
        }
        
        return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(error);
    }
}

