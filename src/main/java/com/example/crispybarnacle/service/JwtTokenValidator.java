package com.example.crispybarnacle.service;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;

@Service
public class JwtTokenValidator {
    
    @Value("${jwt.secret}")
    private String jwtSecret;
    
    private SecretKey getSigningKey() {
        // Use the same key generation logic as JwtTokenGenerator
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
        
        return Keys.hmacShaKeyFor(finalKey);
    }
    
    public String validateTokenAndGetEmail(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
            
            return claims.getSubject();
        } catch (Exception e) {
            return null;
        }
    }
    
    public String extractAuthorities(String token) {
        try {
            Claims claims = Jwts.parser()
                .verifyWith(getSigningKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();
            
            return claims.get("authorities", String.class);
        } catch (Exception e) {
            return null;
        }
    }
}

