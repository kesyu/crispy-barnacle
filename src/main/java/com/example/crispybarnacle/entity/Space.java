package com.example.crispybarnacle.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "spaces")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Space {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String name; // Dog name
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private SpaceColor color;
    
    @ManyToOne
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // null if available
    
    public boolean isAvailable() {
        return user == null;
    }
    
    public enum SpaceColor {
        GREEN, YELLOW, ORANGE, BLUE, PURPLE, WHITE
    }
}


