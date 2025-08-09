export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BACKEND_URL = process.env.BACKEND_URL || "https://apifoodsy-backend.com";

async function handle(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  try {
    const params = await context.params;
    const path = Array.isArray(params?.path) ? params.path.join("/") : "";
    const url = `${BACKEND_URL}/sessions/${path}`;

    const method = request.method;
    const auth = request.headers.get("authorization");
    const cookies = request.headers.get("cookie");
    const contentType = request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    // Robust body extraction (avoid stream reuse errors on Vercel)
    let body: BodyInit | undefined = undefined;
    if (method !== "GET" && method !== "HEAD") {
      try {
        // Read as raw text to avoid JSON/body stream pitfalls
        body = await request.text();
      } catch {
        body = undefined;
      }
    }

    let response: Response;
    try {
      response = await fetch(url, {
      method,
      headers: {
        ...(body ? { "Content-Type": "application/json" } : {}),
        ...(auth ? { Authorization: auth } : {}),
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body,
      cache: "no-store",
      });
    } catch (err: any) {
      console.error("Proxy fetch error for", url, err);
      return new Response(
        JSON.stringify({ error: "Proxy fetch error", message: String(err?.message || err) }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

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

export async function GET(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handle(request, context);
}

export async function POST(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handle(request, context);
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handle(request, context);
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handle(request, context);
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handle(request, context);
}

export async function OPTIONS(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handle(request, context);
}

export async function HEAD(
  request: Request,
  context: { params: Promise<{ path: string[] }> }
) {
  return handle(request, context);
}

