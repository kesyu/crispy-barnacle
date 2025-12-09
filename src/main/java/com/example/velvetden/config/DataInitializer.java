package com.example.velvetden.config;

import com.example.velvetden.entity.Event;
import com.example.velvetden.entity.Space;
import com.example.velvetden.entity.User;
import com.example.velvetden.repository.EventRepository;
import com.example.velvetden.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {
    
    private static final Logger logger = LoggerFactory.getLogger(DataInitializer.class);
    
    private final EventRepository eventRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    
    @Override
    public void run(String... args) {
        // Only initialize if no events exist
        if (eventRepository.count() == 0) {
            createSampleEvent();
        }
        
        // Create demo users if they don't exist
        createDemoUsers();
    }
    
    private void createSampleEvent() {
        Event event = new Event();
        event.setCity("San Francisco");
        event.setDateTime(LocalDateTime.now().plusDays(30));
        event.setUpcoming(true);
        
        // Create 6 spaces with dog names and colors
        List<String> dogNames = Arrays.asList("Buddy", "Max", "Rocky", "Charlie", "Duke", "Cooper");
        List<Space.SpaceColor> colors = Arrays.asList(
            Space.SpaceColor.GREEN,
            Space.SpaceColor.YELLOW,
            Space.SpaceColor.ORANGE,
            Space.SpaceColor.BLUE,
            Space.SpaceColor.PURPLE,
            Space.SpaceColor.WHITE
        );
        
        for (int i = 0; i < 6; i++) {
            Space space = new Space();
            space.setName(dogNames.get(i));
            space.setColor(colors.get(i));
            space.setEvent(event);
            event.addSpace(space);
        }
        
        eventRepository.save(event);
    }
    
    private void createDemoUsers() {
        // Create or update approved user (can book spaces)
        User approvedUser = userRepository.findByEmail("verified@example.com").orElse(new User());
        boolean isNew = approvedUser.getId() == null;
        
        if (isNew) {
            logger.info("Creating approved demo user: verified@example.com");
            approvedUser.setEmail("verified@example.com");
            approvedUser.setCreatedAt(LocalDateTime.now());
        } else {
            logger.info("Updating approved demo user: verified@example.com");
        }
        
        // Always set/update password to ensure it's correct
        String encodedPassword = passwordEncoder.encode("password123");
        approvedUser.setPassword(encodedPassword);
        approvedUser.setFirstName("Alice");
        approvedUser.setLastName("Approved");
        approvedUser.setStatus(User.UserStatus.APPROVED);
        approvedUser.setVerificationImagePath("uploads/demo-verified.jpg");
        
        User saved = userRepository.save(approvedUser);
        logger.info("{} approved user with ID: {} and password hash: {}", 
            isNew ? "Created" : "Updated", saved.getId(), saved.getPassword().substring(0, Math.min(20, saved.getPassword().length())));
        
        // Create or update in review user (can login but cannot book spaces)
        User inReviewUser = userRepository.findByEmail("pending@example.com").orElse(new User());
        boolean isInReviewNew = inReviewUser.getId() == null;
        
        if (isInReviewNew) {
            logger.info("Creating in review demo user: pending@example.com");
            inReviewUser.setEmail("pending@example.com");
            inReviewUser.setCreatedAt(LocalDateTime.now());
        } else {
            logger.info("Updating in review demo user: pending@example.com");
        }
        
        // Always set/update password to ensure it's correct
        String inReviewEncodedPassword = passwordEncoder.encode("password123");
        inReviewUser.setPassword(inReviewEncodedPassword);
        inReviewUser.setFirstName("Bob");
        inReviewUser.setLastName("InReview");
        inReviewUser.setStatus(User.UserStatus.IN_REVIEW);
        inReviewUser.setVerificationImagePath("uploads/demo-pending.jpg");
        
        User savedInReview = userRepository.save(inReviewUser);
        logger.info("{} in review user with ID: {}", 
            isInReviewNew ? "Created" : "Updated", savedInReview.getId());
    }
}


