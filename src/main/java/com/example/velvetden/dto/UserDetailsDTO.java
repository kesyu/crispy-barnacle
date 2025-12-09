package com.example.velvetden.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserDetailsDTO {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String status;
    private boolean approved;
    private LocalDateTime createdAt;
    private String verificationImagePath;
    private int bookedSpacesCount;
}

