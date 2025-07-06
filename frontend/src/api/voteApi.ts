export type VoteType = "like" | "dislike";

export interface CreateVotePayload {
  sessionId: number;
  providerId: string;
  voteType: VoteType;
}

/**
 * POST /api/sessions/{sessionId}/restaurants/{providerId}/vote
 */
export async function createVote({
  sessionId,
  providerId,
  voteType,
}: CreateVotePayload): Promise<void> {
  const res = await fetch(
    `http://localhost:8080/api/sessions/${sessionId}/restaurants/${providerId}/vote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: 'include', // Include HTTP-only cookies for authentication
      body: JSON.stringify({ voteType }),
    },
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(
      `createVote failed: ${res.status} ${res.statusText} ${msg}`,
    );
  }
}
