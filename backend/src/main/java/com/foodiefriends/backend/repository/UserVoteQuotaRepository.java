package com.foodiefriends.backend.repository;

import com.foodiefriends.backend.domain.UserVoteQuota;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserVoteQuotaRepository extends JpaRepository<UserVoteQuota, Long> {
    
    Optional<UserVoteQuota> findBySessionIdAndUserIdAndRound(Long sessionId, String userId, Integer round);
    
    List<UserVoteQuota> findBySessionIdAndRound(Long sessionId, Integer round);
    
    List<UserVoteQuota> findBySessionId(Long sessionId);
    
    @Query("SELECT COUNT(q) FROM UserVoteQuota q WHERE q.sessionId = :sessionId AND q.round = :round AND q.votesUsed >= q.totalAllowed")
    long countCompletedVotersInRound(@Param("sessionId") Long sessionId, @Param("round") Integer round);
    
    @Query("SELECT q FROM UserVoteQuota q WHERE q.sessionId = :sessionId AND q.round = :round AND q.votesUsed < q.totalAllowed")
    List<UserVoteQuota> findIncompleteVotersInRound(@Param("sessionId") Long sessionId, @Param("round") Integer round);
}