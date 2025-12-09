package com.example.velvetden.controller;

import com.example.velvetden.dto.UserDetailsDTO;
import com.example.velvetden.entity.User;
import com.example.velvetden.repository.SpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/users")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class UserController {
    
    private final SpaceRepository spaceRepository;
    
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
        
        return ResponseEntity.ok(dto);
    }
}

