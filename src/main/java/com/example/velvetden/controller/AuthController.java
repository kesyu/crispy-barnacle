package com.example.velvetden.controller;

import com.example.velvetden.dto.LoginRequestDTO;
import com.example.velvetden.entity.User;
import com.example.velvetden.service.CustomUserDetailsService;
import com.example.velvetden.service.JwtTokenGenerator;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class AuthController {
    
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    
    private final AuthenticationManager authenticationManager;
    private final JwtTokenGenerator jwtTokenGenerator;
    private final CustomUserDetailsService userDetailsService;
    
    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody LoginRequestDTO request) {
        try {
            logger.debug("Attempting login for email: {}", request.getEmail());
            
            Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                    request.getEmail(),
                    request.getPassword()
                )
            );
            
            UserDetails userDetails = (UserDetails) authentication.getPrincipal();
            String token = jwtTokenGenerator.generateToken(userDetails);
            User user = userDetailsService.loadUserEntityByUsername(request.getEmail());
            
            logger.info("Successful login for user: {}", request.getEmail());
            
            Map<String, Object> response = new HashMap<>();
            response.put("token", token);
            response.put("email", user.getEmail());
            response.put("firstName", user.getFirstName());
            response.put("lastName", user.getLastName());
            response.put("approved", user.isApproved());
            
            return ResponseEntity.ok(response);
        } catch (BadCredentialsException e) {
            logger.warn("Bad credentials for email: {}", request.getEmail(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Invalid credentials");
            error.put("message", "Email or password is incorrect");
            return ResponseEntity.badRequest().body(error);
        } catch (Exception e) {
            logger.error("Login error for email: {}", request.getEmail(), e);
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Invalid credentials");
            error.put("message", e.getMessage());
            return ResponseEntity.badRequest().body(error);
        }
    }
}


