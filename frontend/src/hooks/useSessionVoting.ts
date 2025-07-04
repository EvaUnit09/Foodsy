import { useState, useEffect, useMemo } from "react";
import { createVote, VoteType } from "@/api/voteApi";

// ---------- helpers ----------
const getVotesStorageKey = (sessionId: number) => `votes_${sessionId}`;

export interface SessionVotingOptions {
  sessionId: number;
  userId?: string;
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
  userId,
  bumpLikeLocally,
  undoLikeLocally,
}: SessionVotingOptions) {
  const disabled = !userId;
  // state ----------------------------------------------------------
  const [voteByProvider, setVoteByProvider] = useState<
    Record<string, VoteType>
  >({});

  // local-storage persistence --------------------------------------
  const storageKey = useMemo(() => getVotesStorageKey(sessionId), [sessionId]);

  useEffect(() => {
    const savedVotes = localStorage.getItem(storageKey);
    if (savedVotes) {
      setVoteByProvider(JSON.parse(savedVotes));
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(voteByProvider));
  }, [voteByProvider, storageKey]);

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
        userId: userId!.trim().toLowerCase(),
        voteType: type,
      });
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

  return { voteByProvider, handleVote, hasVoted, disabled };
}
