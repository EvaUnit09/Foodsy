package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.SessionRestaurantVote;
import com.foodiefriends.backend.domain.VoteType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SessionRestaurantVoteRepository
        extends JpaRepository<SessionRestaurantVote, Long> {

    // NEW – use the nested property 'session.id'
    List<SessionRestaurantVote> findBySession_Id(Long sessionId);

    // Example for a composite lookup
    Optional<SessionRestaurantVote> findBySession_IdAndProviderIdAndUserIdAndRound(
            Long sessionId, String providerId, String userId, Integer round);

    // Count votes by user, session, round, and vote type for round voting limits
    @Query("SELECT COUNT(v) FROM SessionRestaurantVote v WHERE v.session.id = :sessionId AND v.userId = :userId AND v.round = :round AND v.voteType = :voteType")
    int countBySessionIdAndUserIdAndRoundAndVoteType(
            @Param("sessionId") Long sessionId, 
            @Param("userId") String userId, 
            @Param("round") Integer round, 
            @Param("voteType") VoteType voteType);
}