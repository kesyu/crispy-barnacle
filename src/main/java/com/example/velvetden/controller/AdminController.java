package com.example.velvetden.controller;

import com.example.velvetden.dto.UserDetailsDTO;
import com.example.velvetden.entity.User;
import com.example.velvetden.repository.SpaceRepository;
import com.example.velvetden.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/admin/users")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class AdminController {
    
    private final UserRepository userRepository;
    private final SpaceRepository spaceRepository;
    
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
    
    @GetMapping
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) String status) {
        try {
            List<User> users;
            
            if (status != null && !status.isEmpty()) {
                try {
                    User.UserStatus userStatus = User.UserStatus.valueOf(status.toUpperCase());
                    users = userRepository.findAll().stream()
                        .filter(user -> user.getStatus() == userStatus)
                        .collect(Collectors.toList());
                } catch (IllegalArgumentException e) {
                    // Invalid status, return all users
                    users = userRepository.findAll();
                }
            } else {
                users = userRepository.findAll();
            }
            
            List<UserDetailsDTO> userDTOs = users.stream().map(user -> {
                UserDetailsDTO dto = new UserDetailsDTO();
                dto.setId(user.getId());
                dto.setEmail(user.getEmail());
                dto.setFirstName(user.getFirstName());
                dto.setLastName(user.getLastName());
                dto.setStatus(user.getStatus().name());
                dto.setApproved(user.isApproved());
                dto.setCreatedAt(user.getCreatedAt());
                dto.setVerificationImagePath(user.getVerificationImagePath());
                dto.setBookedSpacesCount(spaceRepository.findByUserId(user.getId()).size());
                return dto;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(userDTOs);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to load users: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
}

