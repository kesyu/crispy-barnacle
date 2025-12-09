package com.example.velvetden.controller;

import com.example.velvetden.dto.BookSpaceRequestDTO;
import com.example.velvetden.entity.Space;
import com.example.velvetden.entity.User;
import com.example.velvetden.service.SpaceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/spaces")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class SpaceController {
    
    private final SpaceService spaceService;
    
    @PostMapping("/events/{eventId}/book")
    public ResponseEntity<Map<String, String>> bookSpace(
            @PathVariable Long eventId,
            @RequestBody BookSpaceRequestDTO request,
            Authentication authentication) {
        
        try {
            User user = (User) authentication.getPrincipal();
            Space space = spaceService.bookSpace(eventId, request.getSpaceId(), user);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Space booked successfully");
            response.put("spaceId", space.getId().toString());
            response.put("spaceName", space.getName());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
    
    @DeleteMapping("/{spaceId}/cancel")
    public ResponseEntity<Map<String, String>> cancelBooking(
            @PathVariable Long spaceId,
            Authentication authentication) {
        
        try {
            User user = (User) authentication.getPrincipal();
            spaceService.cancelBooking(spaceId, user);
            
            Map<String, String> response = new HashMap<>();
            response.put("message", "Booking cancelled successfully");
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, String> error = new HashMap<>();
            error.put("error", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}


