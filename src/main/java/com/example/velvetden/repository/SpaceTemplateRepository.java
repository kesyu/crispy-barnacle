package com.example.velvetden.repository;

import com.example.velvetden.entity.SpaceTemplate;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SpaceTemplateRepository extends JpaRepository<SpaceTemplate, Long> {
    List<SpaceTemplate> findAllByOrderByNameAsc();
}

