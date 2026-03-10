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

    return new Response(JSON.stringify({ data: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Route /api/sessions/active GET error:", error);
    return new Response(JSON.stringify({ data: null }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
}
