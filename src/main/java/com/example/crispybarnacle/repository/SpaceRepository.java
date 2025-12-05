package com.example.crispybarnacle.repository;

import com.example.crispybarnacle.entity.Space;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpaceRepository extends JpaRepository<Space, Long> {
    List<Space> findByEventId(Long eventId);
    Optional<Space> findByEventIdAndId(Long eventId, Long spaceId);
    List<Space> findByEventIdAndUserIsNull(Long eventId);
    List<Space> findByUserId(Long userId);
}


