package com.example.velvetden.repository;

import com.example.velvetden.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    Optional<Event> findFirstByIsUpcomingTrueAndDateTimeAfterOrderByDateTimeAsc(LocalDateTime now);
}


