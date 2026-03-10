export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "https://apifoodsy-backend.com";

export async function GET(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    const cookies = request.headers.get("cookie");

    const response = await fetch(`${BACKEND_URL}/sessions/active`, {
      method: "GET",
      headers: {
        ...(auth ? { Authorization: auth } : {}),
        ...(cookies ? { Cookie: cookies } : {}),
      },
      cache: "no-store",
    });

    if (response.status === 404 || response.status === 204) {
      return new Response(JSON.stringify({ data: null }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Forward other non-2xx responses upstream unchanged
    if (!response.ok) {
      const body = await response.text();
      return new Response(body, {
        status: response.status,
        headers: { "Content-Type": response.headers.get("content-type") || "text/plain" },
      });
    }

    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = await response.json();
      // Backend may return an empty array or null for no active session
      if (!data || (Array.isArray(data) && data.length === 0)) {
        return new Response(JSON.stringify({ data: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      const session = Array.isArray(data) ? data[0] : data;
      return new Response(JSON.stringify({ data: session }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Non-JSON 2xx — forward with original content-type
    const body = await response.text();
    return new Response(body, {
      status: response.status,
      headers: { "Content-Type": contentType || "text/plain" },
    });
  } catch (error) {
    console.error("Route /api/sessions/active GET error:", error);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
