package com.example.velvetden.controller;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.File;
import java.nio.file.Path;
import java.nio.file.Paths;

@RestController
@RequestMapping("/api/files")
@CrossOrigin(origins = "${cors.allowed-origins}")
public class FileController {
    
    @Value("${file.upload-dir:uploads}")
    private String uploadDir;
    
    @GetMapping
    public ResponseEntity<Resource> getFile(@RequestParam String path) {
        try {
            if (path == null || path.isEmpty()) {
                return ResponseEntity.badRequest().build();
            }
            
            // Resolve path relative to upload directory
            // Path might be stored as "uploads/filename.jpg" or just "filename.jpg"
            Path filePath;
            if (path.startsWith(uploadDir)) {
                // Path already includes upload directory
                filePath = Paths.get(path).normalize();
            } else {
                // Path is relative, resolve against upload directory
                filePath = Paths.get(uploadDir).resolve(path).normalize();
            }
            
            // Security check: ensure the resolved path is within the upload directory
            Path uploadDirPath = Paths.get(uploadDir).toAbsolutePath().normalize();
            if (!filePath.toAbsolutePath().normalize().startsWith(uploadDirPath)) {
                return ResponseEntity.badRequest().build();
            }
            
            File file = filePath.toFile();
            
            if (!file.exists() || !file.isFile()) {
                return ResponseEntity.notFound().build();
            }
            
            Resource resource = new FileSystemResource(file);
            String contentType = determineContentType(file.getName());
            
            return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getName() + "\"")
                .header(HttpHeaders.CACHE_CONTROL, "no-cache, no-store, must-revalidate")
                .header(HttpHeaders.PRAGMA, "no-cache")
                .header(HttpHeaders.EXPIRES, "0")
                .body(resource);
        } catch (Exception e) {
            return ResponseEntity.notFound().build();
        }
    }
    
    private String determineContentType(String filename) {
        if (filename == null || !filename.contains(".")) {
            return "application/octet-stream";
        }
        String extension = filename.substring(filename.lastIndexOf(".") + 1).toLowerCase();
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg";
            case "png" -> "image/png";
            case "gif" -> "image/gif";
            case "pdf" -> "application/pdf";
            default -> "application/octet-stream";
        };
    }
}

