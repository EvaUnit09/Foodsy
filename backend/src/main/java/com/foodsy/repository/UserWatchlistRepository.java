package com.foodsy.repository;

import com.foodsy.domain.UserWatchlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface UserWatchlistRepository extends JpaRepository<UserWatchlist, Long> {

    List<UserWatchlist> findByUserIdOrderByAddedAtDesc(Long userId);

    boolean existsByUserIdAndPlaceId(Long userId, String placeId);

    @Transactional
    void deleteByUserIdAndPlaceId(Long userId, String placeId);
}
