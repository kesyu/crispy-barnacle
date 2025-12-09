package com.example.velvetden.repository;

import com.example.velvetden.entity.Space;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SpaceRepository extends JpaRepository<Space, Long> {
    List<Space> findByEventId(Long eventId);
    Optional<Space> findByEventIdAndId(Long eventId, Long spaceId);
    List<Space> findByEventIdAndUserIsNull(Long eventId);
    List<Space> findByUserId(Long userId);
    
    @Query("SELECT s FROM Space s LEFT JOIN FETCH s.user WHERE s.id = :spaceId")
    Optional<Space> findByIdWithUser(@Param("spaceId") Long spaceId);
    
    /**
     * Atomically cancels a booking by setting user_id to null only if the space
     * is currently booked by the specified user. Returns the number of rows affected.
     * 
     * @param spaceId The ID of the space to cancel
     * @param userId The ID of the user who should own the booking
     * @return Number of rows updated (1 if successful, 0 if booking doesn't exist or doesn't belong to user)
     */
    @Modifying(clearAutomatically = true)
    @Query("UPDATE Space s SET s.user = null WHERE s.id = :spaceId AND s.user IS NOT NULL AND s.user.id = :userId")
    int cancelBookingIfOwnedByUser(@Param("spaceId") Long spaceId, @Param("userId") Long userId);
}


