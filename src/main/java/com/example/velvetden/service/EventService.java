package com.example.velvetden.service;

import com.example.velvetden.dto.EventDTO;
import com.example.velvetden.dto.SpaceDTO;
import com.example.velvetden.entity.Event;
import com.example.velvetden.entity.Space;
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
}


