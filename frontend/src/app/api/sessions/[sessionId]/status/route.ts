export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "https://apifoodsy-backend.com";

export async function GET(
  request: Request,
  context: { params: Promise<{ sessionId: string }> }
) {
  try {
    const params = await context.params;
    const sessionId = params.sessionId;
    
    const auth = request.headers.get("authorization");
    const cookies = request.headers.get("cookie");

    // Get session data from backend
    const response = await fetch(`${BACKEND_URL}/sessions/${sessionId}`, {
      method: "GET",
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(cookies ? { Cookie: cookies } : {}),
      },
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Session not found" }), {
        status: response.status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const sessionData = await response.json();
    
    // Add timestamp for polling detection
    const statusData = {
      ...sessionData,
      lastUpdate: new Date().toISOString(),
      pollingMode: true
    };

    return new Response(JSON.stringify(statusData), {
      status: 200,
      headers: { 
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate"
      },
    });
  } catch (error) {
    console.error("Session status API error:", error);
    return new Response(JSON.stringify({ error: "Failed to get session status" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}