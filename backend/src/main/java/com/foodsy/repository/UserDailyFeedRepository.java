package com.foodsy.repository;

import com.foodsy.domain.UserDailyFeed;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Optional;

public interface UserDailyFeedRepository extends JpaRepository<UserDailyFeed, Long> {

    Optional<UserDailyFeed> findByUserIdAndFeedDateAndBorough(
            Long userId, LocalDate feedDate, String borough);

    @Modifying
    @Transactional
    @Query("DELETE FROM UserDailyFeed f WHERE f.feedDate < :cutoff")
    int deleteOlderThan(@Param("cutoff") LocalDate cutoff);
}
