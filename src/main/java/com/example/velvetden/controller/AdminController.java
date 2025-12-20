package com.example.velvetden.controller;

import com.example.velvetden.dto.UserDetailsDTO;
import com.example.velvetden.entity.User;
import com.example.velvetden.entity.Space;
import com.example.velvetden.repository.SpaceRepository;
import com.example.velvetden.repository.UserRepository;
import com.example.velvetden.service.FileStorageService;
import com.example.velvetden.service.SpaceService;
import com.example.velvetden.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

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
    private final UserService userService;
    private final FileStorageService fileStorageService;
    private final SpaceService spaceService;
    
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
                dto.setAge(user.getAge());
                dto.setLocation(user.getLocation());
                dto.setHeight(user.getHeight());
                dto.setSize(user.getSize());
                dto.setAdminComments(user.getAdminComments());
                return dto;
            }).collect(Collectors.toList());
            
            return ResponseEntity.ok(userDTOs);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to load users: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    @PutMapping("/{userId}")
    public ResponseEntity<?> updateUser(@PathVariable Long userId, @RequestBody Map<String, Object> updates, Authentication authentication) {
        try {
            // Check if user is authenticated and is an admin
            if (authentication == null || authentication.getPrincipal() == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(403).body(error);
            }
            
            User admin = (User) authentication.getPrincipal();
            if (admin.getIsAdmin() == null || !admin.getIsAdmin()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Admin access required");
                return ResponseEntity.status(403).body(error);
            }
            
            User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));
            
            // Update allowed fields
            if (updates.containsKey("age")) {
                Object ageValue = updates.get("age");
                if (ageValue == null) {
                    user.setAge(null);
                } else if (ageValue instanceof Number) {
                    user.setAge(((Number) ageValue).intValue());
                } else if (ageValue instanceof String && !((String) ageValue).isEmpty()) {
                    try {
                        user.setAge(Integer.parseInt((String) ageValue));
                    } catch (NumberFormatException e) {
                        // Invalid age, skip
                    }
                }
            }
            
            if (updates.containsKey("location")) {
                user.setLocation((String) updates.get("location"));
            }
            
            if (updates.containsKey("height")) {
                user.setHeight((String) updates.get("height"));
            }
            
            if (updates.containsKey("size")) {
                user.setSize((String) updates.get("size"));
            }
            
            if (updates.containsKey("adminComments")) {
                user.setAdminComments((String) updates.get("adminComments"));
            }
            
            userRepository.save(user);
            
            // Return updated user DTO
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
            dto.setAge(user.getAge());
            dto.setLocation(user.getLocation());
            dto.setHeight(user.getHeight());
            dto.setSize(user.getSize());
            dto.setAdminComments(user.getAdminComments());
            
            return ResponseEntity.ok(dto);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to update user: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @PostMapping
    public ResponseEntity<?> createUser(
            @RequestParam(value = "email", required = false) String email,
            @RequestParam(value = "password", required = false) String password,
            @RequestParam(value = "firstName", required = false) String firstName,
            @RequestParam(value = "lastName", required = false) String lastName,
            @RequestParam(value = "status", required = false) String status,
            @RequestParam(value = "verificationImage", required = false) MultipartFile verificationImage,
            @RequestParam(value = "age", required = false) Integer age,
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "height", required = false) String height,
            @RequestParam(value = "size", required = false) String size,
            @RequestParam(value = "adminComments", required = false) String adminComments,
            Authentication authentication) {
        
        try {
            // Check if user is authenticated and is an admin
            if (authentication == null || authentication.getPrincipal() == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(403).body(error);
            }
            
            User admin = (User) authentication.getPrincipal();
            if (admin.getIsAdmin() == null || !admin.getIsAdmin()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Admin access required");
                return ResponseEntity.status(403).body(error);
            }
            
            // Generate email if empty
            if (email == null || email.trim().isEmpty()) {
                email = generateRandomEmail();
            }
            
            // Set default password if empty
            if (password == null || password.trim().isEmpty()) {
                password = "temp123";
            }
            
            // Set default names if empty
            if (firstName == null || firstName.trim().isEmpty()) {
                firstName = "";
            }
            if (lastName == null || lastName.trim().isEmpty()) {
                lastName = "";
            }
            
            // Parse status
            User.UserStatus initialStatus = User.UserStatus.IN_REVIEW;
            if (status != null && !status.isEmpty()) {
                try {
                    initialStatus = User.UserStatus.valueOf(status.toUpperCase());
                } catch (IllegalArgumentException e) {
                    // Invalid status, use default
                }
            }
            
            // Store verification image if provided
            String imagePath = null;
            if (verificationImage != null && !verificationImage.isEmpty()) {
                imagePath = fileStorageService.storeFile(verificationImage);
            }
            
            // Create user
            User user = userService.createUserByAdmin(
                email, password, firstName, lastName, initialStatus,
                imagePath, age, location, height, size, adminComments
            );
            
            // Return user DTO
            UserDetailsDTO dto = new UserDetailsDTO();
            dto.setId(user.getId());
            dto.setEmail(user.getEmail());
            dto.setFirstName(user.getFirstName());
            dto.setLastName(user.getLastName());
            dto.setStatus(user.getStatus().name());
            dto.setApproved(user.isApproved());
            dto.setCreatedAt(user.getCreatedAt());
            dto.setVerificationImagePath(user.getVerificationImagePath());
            dto.setBookedSpacesCount(0);
            dto.setAge(user.getAge());
            dto.setLocation(user.getLocation());
            dto.setHeight(user.getHeight());
            dto.setSize(user.getSize());
            dto.setAdminComments(user.getAdminComments());
            
            return ResponseEntity.ok(dto);
        } catch (DataIntegrityViolationException e) {
            Map<String, Object> error = new HashMap<>();
            String errorMessage = e.getMessage();
            
            if (errorMessage != null && (errorMessage.contains("duplicate key") || 
                                         errorMessage.contains("Unique index") || 
                                         errorMessage.contains("23505") ||
                                         errorMessage.contains("users_email_key"))) {
                errorMessage = "This email is already registered.";
            } else {
                errorMessage = "Failed to create user due to a data constraint violation.";
            }
            
            error.put("error", errorMessage);
            return ResponseEntity.badRequest().body(error);
        } catch (RuntimeException e) {
            Map<String, Object> error = new HashMap<>();
            String errorMessage = e.getMessage();
            
            if (errorMessage != null && errorMessage.contains("already registered")) {
                errorMessage = "This email is already registered.";
            } else if (errorMessage == null || errorMessage.isEmpty()) {
                errorMessage = "Failed to create user. Please check your input and try again.";
            }
            
            error.put("error", errorMessage);
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to create user: " + e.getMessage());
            return ResponseEntity.status(500).body(error);
        }
    }
    
    @PostMapping("/spaces/book")
    public ResponseEntity<?> bookSpaceForUser(
            @RequestParam("eventId") Long eventId,
            @RequestParam("spaceId") Long spaceId,
            @RequestParam("userEmail") String userEmail,
            Authentication authentication) {
        
        try {
            // Check if user is authenticated and is an admin
            if (authentication == null || authentication.getPrincipal() == null) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Authentication required");
                return ResponseEntity.status(403).body(error);
            }
            
            User admin = (User) authentication.getPrincipal();
            if (admin.getIsAdmin() == null || !admin.getIsAdmin()) {
                Map<String, Object> error = new HashMap<>();
                error.put("error", "Admin access required");
                return ResponseEntity.status(403).body(error);
            }
            
            // Find user by email
            User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new RuntimeException("User not found with email: " + userEmail));
            
            // Book space for user
            Space space = spaceService.bookSpaceForUser(eventId, spaceId, user);
            
            Map<String, Object> response = new HashMap<>();
            response.put("message", "Space booked successfully for user");
            response.put("spaceId", space.getId().toString());
            response.put("spaceName", space.getName());
            response.put("userEmail", userEmail);
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    private String generateRandomEmail() {
        // Generate a unique random email like: user1234567890123@temp.local
        // Keep generating until we find one that doesn't exist
        String email;
        int attempts = 0;
        do {
            long timestamp = System.currentTimeMillis();
            int random = (int) (Math.random() * 100000);
            email = "user" + timestamp + random + "@temp.local";
            attempts++;
            // Safety check to prevent infinite loop
            if (attempts > 100) {
                throw new RuntimeException("Unable to generate unique email after multiple attempts");
            }
        } while (userRepository.existsByEmail(email));
        
        return email;
    }
}

