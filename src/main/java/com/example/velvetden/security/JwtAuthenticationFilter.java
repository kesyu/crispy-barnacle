package com.example.velvetden.security;

import com.example.velvetden.entity.User;
import com.example.velvetden.repository.UserRepository;
import com.example.velvetden.service.JwtTokenValidator;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.lang.NonNull;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Collections;
import java.util.List;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtTokenValidator jwtTokenValidator;
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull FilterChain filterChain) throws ServletException, IOException {

        final String authHeader = request.getHeader("Authorization");

        if (authHeader == null || !authHeader.startsWith("Bearer ")) {
            filterChain.doFilter(request, response);
            return;
        }

        try {
            final String jwt = authHeader.substring(7);

            // Validate JWT format before processing
            if (jwt == null || jwt.trim().isEmpty()) {
                filterChain.doFilter(request, response);
                return;
            }

            // Validate token and extract email
            String email = jwtTokenValidator.validateTokenAndGetEmail(jwt);
            if (email != null) {
                // Load user from database
                User user = userRepository.findByEmail(email)
                    .orElse(null);
                
                if (user != null) {
                    // Extract authorities from token
                    String authorities = jwtTokenValidator.extractAuthorities(jwt);
                    List<SimpleGrantedAuthority> grantedAuthorities = Collections.singletonList(
                        new SimpleGrantedAuthority(authorities != null ? authorities : "ROLE_USER")
                    );

                    // Create authentication token
                    UsernamePasswordAuthenticationToken authToken = new UsernamePasswordAuthenticationToken(
                        user,
                        null,
                        grantedAuthorities
                    );
                    authToken.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
                    
                    // Set authentication in security context
                    SecurityContextHolder.getContext().setAuthentication(authToken);
                }
            }

        } catch (Exception e) {
            // Clear security context on any error
            SecurityContextHolder.clearContext();
            // Log but don't throw - let the request continue unauthenticated
            logger.debug("JWT authentication failed: " + e.getMessage());
        }

        filterChain.doFilter(request, response);
    }
}

