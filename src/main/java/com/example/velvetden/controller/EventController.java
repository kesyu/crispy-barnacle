package com.example.velvetden.controller;

import com.example.velvetden.dto.CreateEventRequestDTO;
import com.example.velvetden.dto.EventDTO;
import com.example.velvetden.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/events")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class EventController {
    
    private final EventService eventService;
    
    @GetMapping("/upcoming")
    public ResponseEntity<EventDTO> getUpcomingEvent() {
        EventDTO event = eventService.getUpcomingEvent();
        return ResponseEntity.ok(event);
    }
    
    @GetMapping("/all")
    public ResponseEntity<List<EventDTO>> getAllEvents() {
        List<EventDTO> events = eventService.getAllEvents();
        return ResponseEntity.ok(events);
    }
    
    @PostMapping
    public ResponseEntity<?> createEvent(@RequestBody CreateEventRequestDTO request) {
        try {
            EventDTO event = eventService.createEvent(
                request.getCity(),
                request.getDateTime(),
                request.getSpaceTemplateIds()
            );
            
            return ResponseEntity.ok(event);
        } catch (Exception e) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Failed to create event: " + e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}


