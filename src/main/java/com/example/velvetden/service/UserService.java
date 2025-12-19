package com.example.velvetden.service;

import com.example.velvetden.entity.User;
import com.example.velvetden.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class UserService {
    
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Transactional
    public User registerUser(
            String email, 
            String password, 
            String firstName, 
            String lastName, 
            String imagePath) {
        
        if (userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered");
        }
        
        User user = new User();
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(password));
        user.setFirstName(firstName);
        user.setLastName(lastName);
        user.setVerificationImagePath(imagePath);
        user.setStatus(User.UserStatus.IN_REVIEW);
        user.setCreatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }
    
    public User findByEmail(String email) {
        return userRepository.findByEmail(email)
            .orElseThrow(() -> new RuntimeException("User not found"));
    }
    
    @Transactional
    public User updateVerificationImage(Long userId, String imagePath) {
        User user = userRepository.findById(userId)
            .orElseThrow(() -> new RuntimeException("User not found"));
        
        // Delete old image file if it exists (optional - can be done via cleanup job)
        // For now, just update the path
        
        user.setVerificationImagePath(imagePath);
        // Change status back to IN_REVIEW when new picture is uploaded
        user.setStatus(User.UserStatus.IN_REVIEW);
        
        return userRepository.save(user);
    }
    
    @Transactional
    public User createUserByAdmin(
            String email,
            String password,
            String firstName,
            String lastName,
            User.UserStatus initialStatus,
            String imagePath,
            Integer age,
            String location,
            String height,
            String size,
            String adminComments) {
        
        // Check if email already exists (only if email is provided)
        if (email != null && !email.trim().isEmpty() && userRepository.existsByEmail(email)) {
            throw new RuntimeException("Email already registered");
        }
        
        User user = new User();
        user.setEmail(email != null ? email : "");
        user.setPassword(passwordEncoder.encode(password != null ? password : "temp123"));
        user.setFirstName(firstName != null ? firstName : "");
        user.setLastName(lastName != null ? lastName : "");
        user.setStatus(initialStatus != null ? initialStatus : User.UserStatus.IN_REVIEW);
        user.setVerificationImagePath(imagePath);
        user.setAge(age);
        user.setLocation(location);
        user.setHeight(height);
        user.setSize(size);
        user.setAdminComments(adminComments);
        user.setCreatedAt(LocalDateTime.now());
        
        return userRepository.save(user);
    }
}

