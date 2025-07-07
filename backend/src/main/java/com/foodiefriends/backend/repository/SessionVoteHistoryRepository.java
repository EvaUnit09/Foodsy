package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.SessionVoteHistory;
import com.foodiefriends.backend.domain.VoteType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface SessionVoteHistoryRepository extends JpaRepository<SessionVoteHistory, Long> {
    
    Optional<SessionVoteHistory> findBySessionIdAndUserIdAndProviderIdAndRound(
        Long sessionId, String userId, String providerId, Integer round);
    
    List<SessionVoteHistory> findBySessionIdAndUserIdAndRound(Long sessionId, String userId, Integer round);
    
    List<SessionVoteHistory> findBySessionIdAndRound(Long sessionId, Integer round);
    
    List<SessionVoteHistory> findBySessionIdAndProviderIdAndRound(Long sessionId, String providerId, Integer round);
    
    @Query("SELECT COUNT(h) FROM SessionVoteHistory h WHERE h.sessionId = :sessionId AND h.userId = :userId AND h.round = :round AND h.voteType = :voteType")
    long countBySessionIdAndUserIdAndRoundAndVoteType(
        @Param("sessionId") Long sessionId, 
        @Param("userId") String userId, 
        @Param("round") Integer round, 
        @Param("voteType") VoteType voteType);
    
    @Query("SELECT COUNT(h) FROM SessionVoteHistory h WHERE h.sessionId = :sessionId AND h.providerId = :providerId AND h.round = :round AND h.voteType = :voteType")
    long countVotesForRestaurant(
        @Param("sessionId") Long sessionId, 
        @Param("providerId") String providerId, 
        @Param("round") Integer round, 
        @Param("voteType") VoteType voteType);
    
    List<SessionVoteHistory> findBySessionIdAndUserId(Long sessionId, String userId);
}