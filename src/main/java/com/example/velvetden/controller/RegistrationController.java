package com.example.velvetden.controller;

import com.example.velvetden.entity.User;
import com.example.velvetden.service.EmailService;
import com.example.velvetden.service.FileStorageService;
import com.example.velvetden.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/registration")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class RegistrationController {
    
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final EmailService emailService;
    
    @PostMapping("/register")
    public ResponseEntity<Map<String, Object>> register(
            @RequestParam("email") String email,
            @RequestParam("password") String password,
            @RequestParam("firstName") String firstName,
            @RequestParam("lastName") String lastName,
            @RequestParam("verificationImage") MultipartFile verificationImage) {
        
        try {
            // Store verification image
            String imagePath = fileStorageService.storeFile(verificationImage);
            
            // Create user with IN_REVIEW status
            User user = userService.registerUser(
                email, password, firstName, lastName, imagePath
            );
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Registration successful. Your account is in review.");
            response.put("userId", user.getId());
            response.put("email", user.getEmail());
            response.put("status", user.getStatus().name());
            
            // Send email notification to admin (async, don't block response)
            // Email failure should not affect registration success
            try {
                emailService.sendRegistrationNotification(user);
            } catch (Exception emailException) {
                // Log but don't fail registration if email fails
                // Email error is already logged in EmailService
            }
            
            return ResponseEntity.ok(response);
        } catch (DataIntegrityViolationException e) {
            // Handle database constraint violations (duplicate email, etc.)
            Map<String, Object> error = new HashMap<>();
            String errorMessage = e.getMessage();
            
            // Check if it's a unique constraint violation (duplicate email)
            if (errorMessage != null && (errorMessage.contains("duplicate key") || 
                                         errorMessage.contains("Unique index") || 
                                         errorMessage.contains("23505") ||
                                         errorMessage.contains("users_email_key") ||
                                         errorMessage.contains("EMAIL"))) {
                errorMessage = "This email is already registered. Please use a different email or try logging in.";
            } else {
                errorMessage = "Registration failed due to a data constraint violation. Please check your input.";
            }
            
            error.put("error", errorMessage);
            return ResponseEntity.badRequest().body(error);
        } catch (RuntimeException e) {
            // Handle runtime exceptions (like "Email already registered" from UserService)
            Map<String, Object> error = new HashMap<>();
            String errorMessage = e.getMessage();
            
            if (errorMessage != null && errorMessage.contains("already registered")) {
                errorMessage = "This email is already registered. Please use a different email or try logging in.";
            } else if (errorMessage == null || errorMessage.isEmpty()) {
                errorMessage = "Registration failed. Please check your input and try again.";
            }
            
            error.put("error", errorMessage);
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            // Handle any other exceptions
            Map<String, Object> error = new HashMap<>();
            String errorMessage = e.getMessage();
            
            if (errorMessage == null || errorMessage.isEmpty()) {
                errorMessage = "Registration failed. Please check your input and try again.";
            }
            
            error.put("error", errorMessage);
            return ResponseEntity.badRequest().body(error);
        }
    }
}


