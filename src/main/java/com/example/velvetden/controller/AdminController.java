package com.example.velvetden.controller;

import com.example.velvetden.entity.User;
import com.example.velvetden.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class AdminController {
    
    private final UserRepository userRepository;
    
    @PostMapping("/{userId}/approve")
    public ResponseEntity<Map<String, Object>> approveUser(@PathVariable("userId") Long userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            user.setStatus(User.UserStatus.APPROVED);
            userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User approved successfully");
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
    
    @PostMapping("/{userId}/reject")
    public ResponseEntity<Map<String, Object>> rejectUser(@PathVariable("userId") Long userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            user.setStatus(User.UserStatus.REJECTED);
            userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "User rejected successfully");
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
    
    @PostMapping("/{userId}/request-picture")
    public ResponseEntity<Map<String, Object>> requestPicture(@PathVariable("userId") Long userId) {
        try {
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            user.setStatus(User.UserStatus.PICTURE_REQUESTED);
            userRepository.save(user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Picture request sent to user successfully");
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

