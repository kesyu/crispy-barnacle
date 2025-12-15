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
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class EventService {
    
    private final EventRepository eventRepository;
    private final SpaceTemplateService spaceTemplateService;
    
    @Transactional(readOnly = true)
    public EventDTO getUpcomingEvent() {
        Event event = eventRepository
            .findFirstByIsUpcomingTrueAndDateTimeAfterOrderByDateTimeAsc(LocalDateTime.now())
            .orElseThrow(() -> new RuntimeException("No upcoming event found"));
        
        return convertToDTO(event);
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
        
        return dto;
    }
    
    private SpaceDTO convertSpaceToDTO(Space space) {
        SpaceDTO dto = new SpaceDTO();
        dto.setId(space.getId());
        dto.setName(space.getName());
        dto.setColor(space.getColor().name());
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
            space.setName(template.getName());
            space.setColor(template.getColor());
            space.setEvent(event);
            event.addSpace(space);
        }
        
        Event savedEvent = eventRepository.save(event);
        return convertToDTO(savedEvent);
    }
    
    // Keep old method for backward compatibility if needed
    @Transactional
    public EventDTO createEvent(String city, LocalDateTime dateTime, List<String> spaceNames, List<Space.SpaceColor> spaceColors) {
        if (spaceNames.size() != spaceColors.size()) {
            throw new IllegalArgumentException("Number of space names must match number of space colors");
        }
        
        Event event = new Event();
        event.setCity(city);
        event.setDateTime(dateTime);
        event.setUpcoming(dateTime.isAfter(LocalDateTime.now()));
        
        // Create spaces for the event
        for (int i = 0; i < spaceNames.size(); i++) {
            Space space = new Space();
            space.setName(spaceNames.get(i));
            space.setColor(spaceColors.get(i));
            space.setEvent(event);
            event.addSpace(space);
        }
        
        Event savedEvent = eventRepository.save(event);
        return convertToDTO(savedEvent);
    }
}


