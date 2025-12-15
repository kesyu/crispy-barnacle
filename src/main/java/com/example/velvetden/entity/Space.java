package com.example.velvetden.entity;

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
    
    @ManyToOne
    @JoinColumn(name = "space_template_id", nullable = false)
    private SpaceTemplate template; // Reusable space template
    
    @ManyToOne
    @JoinColumn(name = "event_id", nullable = false)
    private Event event;
    
    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user; // null if available
    
    public boolean isAvailable() {
        return user == null;
    }
    
    // Convenience methods to access template properties
    public String getName() {
        return template != null ? template.getName() : null;
    }
    
    public SpaceColor getColor() {
        return template != null ? template.getColor() : null;
    }
    
    public enum SpaceColor {
        GREEN, YELLOW, ORANGE, BLUE, PURPLE, WHITE
    }
}


