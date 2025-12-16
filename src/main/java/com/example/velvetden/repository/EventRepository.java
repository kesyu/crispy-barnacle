package com.example.velvetden.repository;

import com.example.velvetden.entity.Event;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface EventRepository extends JpaRepository<Event, Long> {
    Optional<Event> findFirstByIsUpcomingTrueAndCancelledFalseAndDateTimeAfterOrderByDateTimeAsc(LocalDateTime now);
    Optional<Event> findFirstByIsUpcomingTrueAndCancelledTrueAndDateTimeAfterOrderByDateTimeAsc(LocalDateTime now);
    // For cancelled events, check dateTime only (ignore isUpcoming flag)
    @Query(value = "SELECT * FROM events WHERE cancelled = true AND date_time > :now ORDER BY date_time ASC LIMIT 1", nativeQuery = true)
    Optional<Event> findFirstCancelledEventAfter(@Param("now") LocalDateTime now);
    List<Event> findAllByOrderByDateTimeDesc();
}


