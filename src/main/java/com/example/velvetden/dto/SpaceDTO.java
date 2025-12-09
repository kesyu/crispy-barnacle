package com.example.velvetden.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpaceDTO {
    private Long id;
    private String name;
    private String color;
    private boolean available;
    private String bookedBy; // User email if booked, null if available
}


