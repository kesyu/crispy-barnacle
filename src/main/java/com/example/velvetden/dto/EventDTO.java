package com.example.velvetden.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EventDTO {
    private Long id;
    private String city;
    private LocalDateTime dateTime;
    private List<SpaceDTO> spaces;
    private int availableSpacesCount;
    private int totalSpacesCount;
    private boolean cancelled;
}


