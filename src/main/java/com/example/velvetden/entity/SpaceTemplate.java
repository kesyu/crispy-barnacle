package com.example.velvetden.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "space_templates")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SpaceTemplate {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Space.SpaceColor color;
    
    @Column(length = 500)
    private String description; // Optional description/details
}

