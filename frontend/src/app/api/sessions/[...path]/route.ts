export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "https://apifoodsy-backend.com";

export async function ALL(
  request: Request,
  { params }: { params: { path: string[] } }
) {
  try {
    const path = Array.isArray(params.path) ? params.path.join("/") : "";
    const auth = request.headers.get("authorization") || undefined;
    const method = request.method;
    const contentType = request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const body = method !== "GET" && method !== "HEAD"
      ? (isJson ? await request.json().catch(() => ({})) : await request.text().catch(() => undefined))
      : undefined;

    const response = await fetch(`${BACKEND_URL}/sessions/${path}`, {
      method,
      headers: {
        ...(isJson ? { "Content-Type": "application/json" } : {}),
        ...(auth ? { Authorization: auth } : {}),
      },
      body: body === undefined ? undefined : (isJson ? JSON.stringify(body) : (body as string)),
      cache: "no-store",
    });

    const respType = response.headers.get("content-type") || "";
    const status = response.status;
    if (respType.includes("application/json")) {
      const data = await response.json();
      return new Response(JSON.stringify(data), {
        status,
        headers: { "Content-Type": "application/json" },
      });
    }

    const text = await response.text();
    return new Response(text, { status });
  } catch (error) {
    console.error("Route /api/sessions/[...path] error:", error);
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

