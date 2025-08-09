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
  const directBase = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://apifoodsy-backend.com';
  // Bypass Vercel proxy for this POST to avoid stream issues
  const voteUrl = `${directBase}/sessions/${sessionId}/restaurants/${encodeURIComponent(providerId)}/vote`;
  const res = await fetch(
    voteUrl,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      // No cookies needed; auth via bearer token
      credentials: 'omit',
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
