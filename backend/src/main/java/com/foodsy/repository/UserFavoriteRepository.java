package com.foodsy.repository;

import com.foodsy.domain.UserFavorite;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface UserFavoriteRepository extends JpaRepository<UserFavorite, Long> {

    List<UserFavorite> findByUserIdOrderByAddedAtDesc(Long userId);

    boolean existsByUserIdAndPlaceId(Long userId, String placeId);

    @Transactional
    void deleteByUserIdAndPlaceId(Long userId, String placeId);
}
