package com.example.velvetden.service;

import com.example.velvetden.entity.User;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.File;
import java.nio.file.Paths;

@Service
@RequiredArgsConstructor
public class EmailService {
    
    private static final Logger logger = LoggerFactory.getLogger(EmailService.class);
    
    private final JavaMailSender mailSender;
    
    @Value("${app.admin.email:eva.balazsfalvi@gmail.com}")
    private String adminEmail;
    
    @Value("${app.base.url:http://localhost:8080}")
    private String baseUrl;
    
    @Value("${app.frontend.url:http://localhost:3000}")
    private String frontendUrl;
    
    public void sendRegistrationNotification(User user) {
        // Run email sending in a separate thread to avoid blocking registration
        new Thread(() -> {
            try {
                MimeMessage message = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
                
                helper.setFrom(adminEmail); // Set from address (required by Gmail)
                helper.setTo(adminEmail);
                helper.setSubject("New User Registration - " + user.getFirstName() + " " + user.getLastName());
                
                String approveUrl = frontendUrl + "/admin.html?userId=" + user.getId() + "&action=approve";
                String rejectUrl = frontendUrl + "/admin.html?userId=" + user.getId() + "&action=reject";
                
                String emailBody = String.format(
                    "A new user has registered and is awaiting review.\n\n" +
                    "User Details:\n" +
                    "Name: %s %s\n" +
                    "Email: %s\n" +
                    "Registration Date: %s\n\n" +
                    "Review the application:\n" +
                    "Approve: %s\n" +
                    "Reject: %s\n\n" +
                    "The verification image is attached to this email.",
                    user.getFirstName(),
                    user.getLastName(),
                    user.getEmail(),
                    user.getCreatedAt(),
                    approveUrl,
                    rejectUrl
                );
                
                helper.setText(emailBody);
                
                // Attach the verification image if the path exists
                if (user.getVerificationImagePath() != null && !user.getVerificationImagePath().isEmpty()) {
                    try {
                        File imageFile = Paths.get(user.getVerificationImagePath()).toFile();
                        if (imageFile.exists() && imageFile.isFile()) {
                            FileSystemResource fileResource = new FileSystemResource(imageFile);
                            String filename = imageFile.getName();
                            // Extract extension from filename
                            String extension = filename.contains(".") 
                                ? filename.substring(filename.lastIndexOf(".")) 
                                : "";
                            helper.addAttachment("verification-image" + extension, fileResource);
                            logger.debug("Attached verification image: {}", user.getVerificationImagePath());
                        } else {
                            logger.warn("Verification image file not found: {}", user.getVerificationImagePath());
                        }
                    } catch (Exception fileException) {
                        logger.error("Failed to attach verification image for user {}: {}", 
                            user.getEmail(), fileException.getMessage());
                        // Continue sending email without attachment
                    }
                }
                
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

