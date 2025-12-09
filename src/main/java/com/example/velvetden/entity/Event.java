package com.example.velvetden.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "events")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Event {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false)
    private String city;
    
    @Column(nullable = false)
    private LocalDateTime dateTime;
    
    @OneToMany(mappedBy = "event", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<Space> spaces = new ArrayList<>();
    
    @Column(nullable = false)
    private boolean isUpcoming = true;
    
    public void addSpace(Space space) {
        spaces.add(space);
        space.setEvent(this);
    }
    
    public int getAvailableSpacesCount() {
        return (int) spaces.stream().filter(space -> space.getUser() == null).count();
    }
    
    public int getTotalSpacesCount() {
        return spaces.size();
    }
}


