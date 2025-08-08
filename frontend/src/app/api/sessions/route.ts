export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "https://apifoodsy-backend.com";

export async function POST(request: Request) {
  try {
    const auth = request.headers.get("authorization");
    const cookies = request.headers.get("cookie");
    const body = await request.json().catch(() => ({}));

    const response = await fetch(`${BACKEND_URL}/sessions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(auth ? { Authorization: auth } : {}),
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body: JSON.stringify(body),
      cache: "no-store",
    });

    const contentType = response.headers.get("content-type") || "";
    const status = response.status;

    if (contentType.includes("application/json")) {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const text = await response.text();
    return new Response(text, { status });
  } catch (error) {
    console.error("Route /api/sessions POST error:", error);
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

