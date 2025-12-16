package com.example.velvetden.service;

import com.example.velvetden.dto.EventDTO;
import com.example.velvetden.dto.SpaceDTO;
import com.example.velvetden.entity.Event;
import com.example.velvetden.entity.Space;
import com.example.velvetden.entity.SpaceTemplate;
import com.example.velvetden.repository.EventRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {
    
    private final EventRepository eventRepository;
    private final SpaceTemplateService spaceTemplateService;
    
    @Transactional(readOnly = true)
    public EventDTO getUpcomingEvent() {
        LocalDateTime now = LocalDateTime.now();
        
        // Get the earliest cancelled upcoming event (before its date/time passes)
        // For cancelled events, we check dateTime only (ignore isUpcoming flag)
        Optional<Event> cancelledEvent = eventRepository
            .findFirstCancelledEventAfter(now);
        
        // Get the earliest non-cancelled upcoming event
        Optional<Event> nonCancelledEvent = eventRepository
            .findFirstByIsUpcomingTrueAndCancelledFalseAndDateTimeAfterOrderByDateTimeAsc(now);
        
        // If both exist, prioritize non-cancelled event if they're at the same date/time
        // Otherwise, show whichever is earlier
        if (cancelledEvent.isPresent() && nonCancelledEvent.isPresent()) {
            Event cancelled = cancelledEvent.get();
            Event nonCancelled = nonCancelledEvent.get();
            
            // If they're at the same date/time, prioritize non-cancelled
            if (cancelled.getDateTime().equals(nonCancelled.getDateTime())) {
                return convertToDTO(nonCancelled);
            }
            
            // Otherwise, show whichever is earlier
            if (cancelled.getDateTime().isBefore(nonCancelled.getDateTime())) {
                return convertToDTO(cancelled);
            } else {
                return convertToDTO(nonCancelled);
            }
        }
        
        // If only cancelled event exists, show it
        if (cancelledEvent.isPresent()) {
            return convertToDTO(cancelledEvent.get());
        }
        
        // If only non-cancelled event exists, show it
        if (nonCancelledEvent.isPresent()) {
            return convertToDTO(nonCancelledEvent.get());
        }
        
        throw new RuntimeException("No upcoming event found");
    }
    
    private EventDTO convertToDTO(Event event) {
        List<SpaceDTO> spaceDTOs = event.getSpaces().stream()
            .map(this::convertSpaceToDTO)
            .collect(Collectors.toList());
        
        EventDTO dto = new EventDTO();
        dto.setId(event.getId());
        dto.setCity(event.getCity());
        dto.setDateTime(event.getDateTime());
        dto.setSpaces(spaceDTOs);
        dto.setAvailableSpacesCount(event.getAvailableSpacesCount());
        dto.setTotalSpacesCount(event.getTotalSpacesCount());
        dto.setCancelled(event.isCancelled());
        
        return dto;
    }
    
    private SpaceDTO convertSpaceToDTO(Space space) {
        SpaceDTO dto = new SpaceDTO();
        dto.setId(space.getId());
        dto.setName(space.getName());
        Space.SpaceColor color = space.getColor();
        dto.setColor(color != null ? color.name() : null);
        dto.setAvailable(space.isAvailable());
        dto.setBookedBy(space.getUser() != null ? space.getUser().getEmail() : null);
        return dto;
    }
    
    @Transactional(readOnly = true)
    public List<EventDTO> getAllEvents() {
        List<Event> events = eventRepository.findAllByOrderByDateTimeDesc();
        return events.stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional
    public EventDTO createEvent(String city, LocalDateTime dateTime, List<Long> spaceTemplateIds) {
        if (spaceTemplateIds == null || spaceTemplateIds.isEmpty()) {
            throw new IllegalArgumentException("At least one space template must be selected");
        }
        
        if (spaceTemplateIds.size() > 6) {
            throw new IllegalArgumentException("Maximum 6 spaces allowed per event");
        }
        
        // Fetch space templates
        List<SpaceTemplate> templates = spaceTemplateService.getTemplatesByIds(spaceTemplateIds);
        
        if (templates.size() != spaceTemplateIds.size()) {
            throw new IllegalArgumentException("One or more space templates not found");
        }
        
        Event event = new Event();
        event.setCity(city);
        event.setDateTime(dateTime);
        event.setUpcoming(dateTime.isAfter(LocalDateTime.now()));
        
        // Create spaces from templates
        for (SpaceTemplate template : templates) {
            Space space = new Space();
            space.setTemplate(template);
            space.setEvent(event);
            event.addSpace(space);
        }
        
        Event savedEvent = eventRepository.save(event);
        return convertToDTO(savedEvent);
    }
    
    @Transactional
    public EventDTO cancelEvent(Long eventId) {
        Event event = eventRepository.findById(eventId)
            .orElseThrow(() -> new RuntimeException("Event not found: " + eventId));
        
        event.setCancelled(true);
        Event savedEvent = eventRepository.save(event);
        return convertToDTO(savedEvent);
    }
    
}


