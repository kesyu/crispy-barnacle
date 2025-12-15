package com.example.velvetden.controller;

import com.example.velvetden.dto.SpaceTemplateDTO;
import com.example.velvetden.service.SpaceTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/space-templates")
@CrossOrigin(origins = "${cors.allowed-origins}")
@RequiredArgsConstructor
public class SpaceTemplateController {
    
    private final SpaceTemplateService spaceTemplateService;
    
    @GetMapping
    public ResponseEntity<List<SpaceTemplateDTO>> getAllTemplates() {
        List<SpaceTemplateDTO> templates = spaceTemplateService.getAllTemplates();
        return ResponseEntity.ok(templates);
    }
    
    @GetMapping("/{id}")
    public ResponseEntity<SpaceTemplateDTO> getTemplateById(@PathVariable Long id) {
        SpaceTemplateDTO template = spaceTemplateService.getTemplateById(id);
        return ResponseEntity.ok(template);
    }
}

