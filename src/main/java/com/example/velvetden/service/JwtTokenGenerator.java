package com.example.velvetden.service;

import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.stream.Collectors;

@Service
public class JwtTokenGenerator {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    @Value("${jwt.expiration}")
    private Long expiration;
    
    private SecretKey getSigningKey() {
        // Use the same key generation logic as JwtConfig to ensure compatibility
        // Ensure the secret is exactly 32 bytes (256 bits) for HS256
        // If larger, truncate; if smaller, pad
        byte[] keyBytes = jwtSecret.getBytes(StandardCharsets.UTF_8);
        byte[] finalKey = new byte[32];
        
        if (keyBytes.length < 32) {
            // Pad or repeat the key to meet minimum length requirement
            System.arraycopy(keyBytes, 0, finalKey, 0, keyBytes.length);
            for (int i = keyBytes.length; i < 32; i++) {
                finalKey[i] = keyBytes[i % keyBytes.length];
            }
        } else {
            // Truncate to exactly 32 bytes for HS256
            System.arraycopy(keyBytes, 0, finalKey, 0, 32);
        }
        
        // Use Keys.hmacShaKeyFor with exactly 32 bytes to ensure HS256
        return Keys.hmacShaKeyFor(finalKey);
    }
    
    public String generateToken(UserDetails userDetails) {
        String authorities = userDetails.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .collect(Collectors.joining(" "));
        
        SecretKey signingKey = getSigningKey();
        
        return Jwts.builder()
            .subject(userDetails.getUsername())
            .claim("authorities", authorities)
            .issuer("the-velvet-den")
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + expiration))
            .signWith(signingKey, io.jsonwebtoken.Jwts.SIG.HS256) // Explicitly use HS256
            .compact();
    }
}

