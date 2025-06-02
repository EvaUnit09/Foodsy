export type VoteType = "like" | "dislike";

export interface CreateVotePayload {
  sessionId: number;
  providerId: string;
  userId: string;
  voteType: VoteType;
}
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:8080";
/**
 * POST /api/sessions/{sessionId}/restaurants/{providerId}/vote
 */
export async function createVote({
  sessionId,
  providerId,
  userId,
  voteType,
}: CreateVotePayload): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/api/sessions/${sessionId}/restaurants/${providerId}/vote`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, userId, voteType }),
    },
  );

  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(
      `createVote failed: ${res.status} ${res.statusText} ${msg}`,
    );
  }
}
