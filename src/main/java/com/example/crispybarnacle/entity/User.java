package com.example.crispybarnacle.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.ToString;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
@ToString(exclude = "bookedSpaces")
@EqualsAndHashCode(exclude = "bookedSpaces")
public class User {
    
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, unique = true)
    private String email;
    
    @Column(nullable = false)
    private String password; // Should be hashed
    
    @Column(nullable = false)
    private String firstName;
    
    @Column(nullable = false)
    private String lastName;
    
    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private UserStatus status = UserStatus.IN_REVIEW;
    
    @Column(length = 1000)
    private String verificationImagePath; // Path to uploaded verification image
    
    @Column(length = 1000)
    private String verificationNotes; // Admin notes about verification
    
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
    
    @OneToMany(mappedBy = "user", cascade = CascadeType.ALL)
    @JsonIgnore // Prevent lazy loading issues during serialization
    private List<Space> bookedSpaces = new ArrayList<>();
    
    public enum UserStatus {
        IN_REVIEW,
        APPROVED,
        REJECTED
    }
    
    public boolean isApproved() {
        return status == UserStatus.APPROVED;
    }
}


