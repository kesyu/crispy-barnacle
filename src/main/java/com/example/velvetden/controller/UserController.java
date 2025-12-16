package com.example.velvetden.controller;

import com.example.velvetden.dto.UserDetailsDTO;
import com.example.velvetden.entity.User;
import com.example.velvetden.repository.SpaceRepository;
import com.example.velvetden.repository.UserRepository;
import com.example.velvetden.service.EmailService;
import com.example.velvetden.service.FileStorageService;
import com.example.velvetden.service.UserService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class UserController {
    
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);
    
    private final SpaceRepository spaceRepository;
    private final UserRepository userRepository;
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final EmailService emailService;
    
    @GetMapping("/me")
    public ResponseEntity<UserDetailsDTO> getCurrentUser(Authentication authentication) {
        User user = (User) authentication.getPrincipal();
        
        // Get booked spaces count for this user
        int bookedSpacesCount = spaceRepository.findByUserId(user.getId()).size();
        
        UserDetailsDTO dto = new UserDetailsDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setStatus(user.getStatus().name());
        dto.setApproved(user.isApproved());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setVerificationImagePath(user.getVerificationImagePath());
        dto.setBookedSpacesCount(bookedSpacesCount);
        dto.setAge(user.getAge());
        dto.setLocation(user.getLocation());
        dto.setHeight(user.getHeight());
        dto.setSize(user.getSize());
        // Don't include adminComments for regular users
        
        return ResponseEntity.ok(dto);
    }
    
    @GetMapping("/{userId}")
    public ResponseEntity<UserDetailsDTO> getUserById(@PathVariable Long userId, Authentication authentication) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        int bookedSpacesCount = spaceRepository.findByUserId(user.getId()).size();
        
        UserDetailsDTO dto = new UserDetailsDTO();
        dto.setId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setStatus(user.getStatus().name());
        dto.setApproved(user.isApproved());
        dto.setCreatedAt(user.getCreatedAt());
        dto.setVerificationImagePath(user.getVerificationImagePath());
        dto.setBookedSpacesCount(bookedSpacesCount);
        dto.setAge(user.getAge());
        dto.setLocation(user.getLocation());
        dto.setHeight(user.getHeight());
        dto.setSize(user.getSize());
        
        // Only include adminComments if the requester is an admin
        if (authentication != null && authentication.getPrincipal() instanceof User) {
            User requester = (User) authentication.getPrincipal();
            if (requester.getIsAdmin() != null && requester.getIsAdmin()) {
                dto.setAdminComments(user.getAdminComments());
            }
        }
        
        return ResponseEntity.ok(dto);
    }
    
    @PostMapping("/me/upload-picture")
    public ResponseEntity<Map<String, Object>> uploadPicture(
            @RequestParam("verificationImage") MultipartFile verificationImage,
            Authentication authentication) {
        try {
            User principalUser = (User) authentication.getPrincipal();
            
            // Reload user from database to ensure we have the latest status
            User user = userRepository.findById(principalUser.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Check if user has PICTURE_REQUESTED status
            if (user.getStatus() != User.UserStatus.PICTURE_REQUESTED) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "You can only upload a new picture when your status is PICTURE_REQUESTED");
                return ResponseEntity.badRequest().body(error);
            }
            
            // Store the new verification image
            String imagePath = fileStorageService.storeFile(verificationImage);
            
            // Update user with new image and change status to IN_REVIEW
            User updatedUser = userService.updateVerificationImage(user.getId(), imagePath);
            
            // Send email notification to admin (async)
            try {
                emailService.sendRegistrationNotification(updatedUser);
            } catch (Exception emailException) {
                // Log but don't fail upload if email fails
            }
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Picture uploaded successfully. Your account is back in review.");
            response.put("status", updatedUser.getStatus().name());
            response.put("verificationImagePath", updatedUser.getVerificationImagePath());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            logger.error("Failed to upload picture for user: {}", authentication != null ? ((User) authentication.getPrincipal()).getEmail() : "unknown", e);
            Map<String, Object> error = new HashMap<>();
            String errorMessage = e.getMessage() != null ? e.getMessage() : "Failed to upload picture";
            error.put("error", errorMessage);
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PutMapping("/me")
    public ResponseEntity<?> updateCurrentUser(@RequestBody Map<String, Object> updates, Authentication authentication) {
        try {
            User user = (User) authentication.getPrincipal();
            
            // Reload user from database to ensure we have the latest data
            User currentUser = userRepository.findById(user.getId())
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Update allowed fields (users can only update their own age, location, height, size)
            if (updates.containsKey("age")) {
                Object ageValue = updates.get("age");
                if (ageValue == null) {
                    currentUser.setAge(null);
                } else if (ageValue instanceof Number) {
                    currentUser.setAge(((Number) ageValue).intValue());
                } else if (ageValue instanceof String && !((String) ageValue).isEmpty()) {
                    try {
                        currentUser.setAge(Integer.parseInt((String) ageValue));
                    } catch (NumberFormatException e) {
                        // Invalid age, skip
                    }
                }
            }
            
            if (updates.containsKey("location")) {
                currentUser.setLocation((String) updates.get("location"));
            }
            
            if (updates.containsKey("height")) {
                currentUser.setHeight((String) updates.get("height"));
            }
            
            if (updates.containsKey("size")) {
                currentUser.setSize((String) updates.get("size"));
            }
            
            userRepository.save(currentUser);
            
            // Return updated user DTO
            int bookedSpacesCount = spaceRepository.findByUserId(currentUser.getId()).size();
            UserDetailsDTO dto = new UserDetailsDTO();
            dto.setId(currentUser.getId());
            dto.setEmail(currentUser.getEmail());
            dto.setFirstName(currentUser.getFirstName());
            dto.setLastName(currentUser.getLastName());
            dto.setStatus(currentUser.getStatus().name());
            dto.setApproved(currentUser.isApproved());
            dto.setCreatedAt(currentUser.getCreatedAt());
            dto.setVerificationImagePath(currentUser.getVerificationImagePath());
            dto.setBookedSpacesCount(bookedSpacesCount);
            dto.setAge(currentUser.getAge());
            dto.setLocation(currentUser.getLocation());
            dto.setHeight(currentUser.getHeight());
            dto.setSize(currentUser.getSize());
            
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            logger.error("Failed to update user profile: {}", authentication != null ? ((User) authentication.getPrincipal()).getEmail() : "unknown", e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to update profile: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}

