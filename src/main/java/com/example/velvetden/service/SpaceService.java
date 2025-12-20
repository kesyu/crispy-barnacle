package com.example.velvetden.service;

import com.example.velvetden.entity.Space;
import com.example.velvetden.entity.User;
import com.example.velvetden.repository.EventRepository;
import com.example.velvetden.repository.SpaceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SpaceService {
    
    private final SpaceRepository spaceRepository;
    private final EventRepository eventRepository;
    
    @Transactional
    public Space bookSpace(Long eventId, Long spaceId, User user) {
        if (!user.isApproved()) {
            throw new RuntimeException("Only approved users can book spaces");
        }
        
        if (eventId == null) {
            throw new IllegalArgumentException("Event ID cannot be null");
        }
        if (spaceId == null) {
            throw new IllegalArgumentException("Space ID cannot be null");
        }
        
        // Check if user already has a booking for this event
        if (spaceRepository.findByUserId(user.getId()).stream()
                .anyMatch(s -> s.getEvent().getId().equals(eventId))) {
            throw new RuntimeException("You can only book one space per event");
        }
        
        // Verify event exists
        if (!eventRepository.existsById(eventId)) {
            throw new RuntimeException("Event not found");
        }
        
        Space space = spaceRepository.findByEventIdAndId(eventId, spaceId)
            .orElseThrow(() -> new RuntimeException("Space not found"));
        
        if (!space.isAvailable()) {
            throw new RuntimeException("Space is already booked");
        }
        
        space.setUser(user);
        return spaceRepository.save(space);
    }
    
    @Transactional
    public Space bookSpaceForUser(Long eventId, Long spaceId, User user) {
        // Admin can book for any user, but still check if user exists
        if (user == null) {
            throw new RuntimeException("User not found");
        }
        
        if (eventId == null) {
            throw new IllegalArgumentException("Event ID cannot be null");
        }
        if (spaceId == null) {
            throw new IllegalArgumentException("Space ID cannot be null");
        }
        
        // Check if user already has a booking for this event
        if (spaceRepository.findByUserId(user.getId()).stream()
                .anyMatch(s -> s.getEvent().getId().equals(eventId))) {
            throw new RuntimeException("User already has a booking for this event");
        }
        
        // Verify event exists
        if (!eventRepository.existsById(eventId)) {
            throw new RuntimeException("Event not found");
        }
        
        Space space = spaceRepository.findByEventIdAndId(eventId, spaceId)
            .orElseThrow(() -> new RuntimeException("Space not found"));
        
        if (!space.isAvailable()) {
            throw new RuntimeException("Space is already booked");
        }
        
        space.setUser(user);
        return spaceRepository.save(space);
    }
    
    @Transactional
    public void cancelBooking(Long spaceId, User user) {
        if (spaceId == null) {
            throw new IllegalArgumentException("Space ID cannot be null");
        }
        
        // Verify space exists
        if (!spaceRepository.existsById(spaceId)) {
            throw new RuntimeException("Space not found");
        }
        
        // Atomically cancel booking only if it's still booked by this user
        // This prevents race conditions where another request could cancel/book the space
        // between validation and save
        int rowsAffected = spaceRepository.cancelBookingIfOwnedByUser(spaceId, user.getId());
        
        if (rowsAffected == 0) {
            // Either space is not booked, or booking doesn't belong to this user
            // Fetch to provide a more specific error message
            Space space = spaceRepository.findByIdWithUser(spaceId)
                .orElseThrow(() -> new RuntimeException("Space not found"));
            
            if (space.getUser() == null) {
                throw new RuntimeException("Space is not currently booked.");
            }
            
            if (!space.getUser().getId().equals(user.getId())) {
                throw new RuntimeException("Space is not booked by this user.");
            }
            
            // This shouldn't happen, but handle it just in case
            throw new RuntimeException("Failed to cancel booking. Please try again.");
        }
    }
}


