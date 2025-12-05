package com.example.crispybarnacle.controller;

import com.example.crispybarnacle.dto.EventDTO;
import com.example.crispybarnacle.service.EventService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
}


