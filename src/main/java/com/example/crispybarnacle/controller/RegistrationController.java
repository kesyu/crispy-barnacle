package com.example.crispybarnacle.controller;

import com.example.crispybarnacle.entity.User;
import com.example.crispybarnacle.service.FileStorageService;
import com.example.crispybarnacle.service.UserService;
import lombok.RequiredArgsConstructor;
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
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}


