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
  const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
  const res = await fetch(
    `/api/sessions/${sessionId}/restaurants/${providerId}/vote`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      credentials: 'include',
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
