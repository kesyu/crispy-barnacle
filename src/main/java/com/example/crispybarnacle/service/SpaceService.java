package com.example.crispybarnacle.service;

import com.example.crispybarnacle.entity.Space;
import com.example.crispybarnacle.entity.User;
import com.example.crispybarnacle.repository.EventRepository;
import com.example.crispybarnacle.repository.SpaceRepository;
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
    public void cancelBooking(Long spaceId, User user) {
        if (spaceId == null) {
            throw new IllegalArgumentException("Space ID cannot be null");
        }
        
        // Fetch space with user eagerly loaded to avoid lazy loading issues
        Space space = spaceRepository.findByIdWithUser(spaceId)
            .orElseThrow(() -> new RuntimeException("Space not found"));
        
        // Check if space is booked
        if (space.getUser() == null) {
            throw new RuntimeException("Space is not booked");
        }
        
        // Check if the booking belongs to this user
        Long spaceUserId = space.getUser().getId();
        if (!spaceUserId.equals(user.getId())) {
            throw new RuntimeException("Space is not booked by this user");
        }
        
        space.setUser(null);
        spaceRepository.save(space);
    }
}


