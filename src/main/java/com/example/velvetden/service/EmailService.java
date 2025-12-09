package com.example.velvetden.service;

import com.example.velvetden.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    private final JavaMailSender mailSender;
    
    @Value("${app.admin.email:eva.balazsfalvi@gmail.com}")
    private String adminEmail;
    
    @Value("${app.base.url:http://localhost:8080}")
    private String baseUrl;
    
    public void sendRegistrationNotification(User user) {
        // Run email sending in a separate thread to avoid blocking registration
        new Thread(() -> {
            try {
                SimpleMailMessage message = new SimpleMailMessage();
                message.setFrom(adminEmail); // Set from address (required by Gmail)
                message.setTo(adminEmail);
                message.setSubject("New User Registration - " + user.getFirstName() + " " + user.getLastName());
                
                String approveUrl = baseUrl + "/api/admin/users/" + user.getId() + "/approve";
                String rejectUrl = baseUrl + "/api/admin/users/" + user.getId() + "/reject";
                
                String emailBody = String.format(
                    "A new user has registered and is awaiting review.\n\n" +
                    "User Details:\n" +
                    "Name: %s %s\n" +
                    "Email: %s\n" +
                    "Registration Date: %s\n\n" +
                    "Review the application:\n" +
                    "Approve: %s\n" +
                    "Reject: %s\n\n" +
                    "Note: The verification image is stored at: %s",
                    user.getFirstName(),
                    user.getLastName(),
                    user.getEmail(),
                    user.getCreatedAt(),
                    approveUrl,
                    rejectUrl,
                    user.getVerificationImagePath()
                );
                
                message.setText(emailBody);
                mailSender.send(message);
                logger.info("Registration notification email sent to {} for user {}", adminEmail, user.getEmail());
            } catch (Exception e) {
                logger.error("Failed to send registration notification email for user {}: {}", 
                    user.getEmail(), e.getMessage());
                // Don't throw - email failure shouldn't break registration
            }
        }).start();
    }
}

