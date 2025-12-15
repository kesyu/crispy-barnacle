package com.example.velvetden.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CreateEventRequestDTO {
    private String city;
    private LocalDateTime dateTime;
    private List<Long> spaceTemplateIds; // IDs of space templates to use
}

