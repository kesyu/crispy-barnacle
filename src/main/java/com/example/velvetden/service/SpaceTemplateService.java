package com.example.velvetden.service;

import com.example.velvetden.dto.SpaceTemplateDTO;
import com.example.velvetden.entity.SpaceTemplate;
import com.example.velvetden.repository.SpaceTemplateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SpaceTemplateService {
    
    private final SpaceTemplateRepository spaceTemplateRepository;
    
    @Transactional(readOnly = true)
    public List<SpaceTemplateDTO> getAllTemplates() {
        return spaceTemplateRepository.findAllByOrderByNameAsc().stream()
            .map(this::convertToDTO)
            .collect(Collectors.toList());
    }
    
    @Transactional(readOnly = true)
    public SpaceTemplateDTO getTemplateById(Long id) {
        SpaceTemplate template = spaceTemplateRepository.findById(id)
            .orElseThrow(() -> new RuntimeException("Space template not found: " + id));
        return convertToDTO(template);
    }
    
    @Transactional(readOnly = true)
    public List<SpaceTemplate> getTemplatesByIds(List<Long> ids) {
        return spaceTemplateRepository.findAllById(ids);
    }
    
    private SpaceTemplateDTO convertToDTO(SpaceTemplate template) {
        SpaceTemplateDTO dto = new SpaceTemplateDTO();
        dto.setId(template.getId());
        dto.setName(template.getName());
        dto.setColor(template.getColor().name());
        dto.setDescription(template.getDescription());
        return dto;
    }
}

