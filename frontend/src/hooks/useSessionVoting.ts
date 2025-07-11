import { useState, useEffect } from "react";
import { createVote, VoteType } from "@/api/voteApi";
import { useAuth } from "@/contexts/AuthContext";

export interface SessionVotingOptions {
  sessionId: number;
  currentRound: number;
  bumpLikeLocally?: (restaurant: { providerId: string }) => void;
  undoLikeLocally?: (restaurant: { providerId: string }) => void;
}

interface VoteParams {
  providerId: string;
  type: VoteType;
  currentRestaurantObj?: { providerId: string };
}

// ---------- hook ----------
export function useSessionVoting({
  sessionId,
  currentRound,
  bumpLikeLocally,
  undoLikeLocally,
}: SessionVotingOptions) {
  const { isAuthenticated } = useAuth();
  const disabled = !isAuthenticated;
  
  // state ----------------------------------------------------------
  const [voteByProvider, setVoteByProvider] = useState<
    Record<string, VoteType>
  >({});
  const [remainingVotes, setRemainingVotes] = useState<number>(0);

  // Fetch remaining votes function
  const fetchRemainingVotes = async () => {
    if (!isAuthenticated || !sessionId) return;
    
    try {
      const response = await fetch(`http://localhost:8080/api/sessions/${sessionId}/remaining-votes`, {
        credentials: 'include'
      });
      if (response.ok) {
        const data = await response.json();
        setRemainingVotes(data.remainingVotes);
      }
    } catch (error) {
      console.error('Failed to fetch remaining votes:', error);
    }
  };

  // Reset votes when round changes and force refresh of remaining votes
  useEffect(() => {
    setVoteByProvider({});
    // Force immediate refresh of remaining votes when round changes
    if (isAuthenticated && sessionId) {
      // Add small delay to ensure backend has processed round transition
      setTimeout(() => {
        fetchRemainingVotes();
      }, 500);
    }
  }, [currentRound, isAuthenticated, sessionId]);

  // Fetch remaining votes on mount and round change
  useEffect(() => {
    fetchRemainingVotes();
  }, [sessionId, isAuthenticated, currentRound]); // Removed voteByProvider dependency

  // public API -----------------------------------------------------
  const hasVoted = (providerId: string) => providerId in voteByProvider;

  const handleVote = async ({
    providerId,
    type,
    currentRestaurantObj,
  }: VoteParams): Promise<void> => {
    if (disabled || !providerId || hasVoted(providerId)) return;

    // optimistic UI ------------------------------------------------
    setVoteByProvider((prev) => ({ ...prev, [providerId]: type }));
    if (type === "like" && bumpLikeLocally && currentRestaurantObj) {
      bumpLikeLocally(currentRestaurantObj);
    }

    try {
      await createVote({
        sessionId,
        providerId,
        voteType: type,
      });
      
      // Manually refresh remaining votes after successful vote
      await fetchRemainingVotes();
    } catch (error) {
      // rollback on failure ----------------------------------------
      setVoteByProvider((prev) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [providerId]: _ignored, ...rest } = prev;
        return rest;
      });
      if (type === "like" && undoLikeLocally && currentRestaurantObj) {
        undoLikeLocally(currentRestaurantObj);
      }
      console.error("Vote failed:", error);
    }
  };

  return { voteByProvider, handleVote, hasVoted, disabled, remainingVotes };
}
