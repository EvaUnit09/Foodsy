package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.SessionRestaurantVote;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SessionRestaurantVoteRepository
        extends JpaRepository<SessionRestaurantVote, Long> {


    // NEW – use the nested property 'session.id'
    List<SessionRestaurantVote> findBySession_Id(Long sessionId);

    // Example for a composite lookup
    Optional<SessionRestaurantVote> findBySession_IdAndProviderIdAndUserIdAndRound(
            Long sessionId, String providerId, String userId, Integer round);
}