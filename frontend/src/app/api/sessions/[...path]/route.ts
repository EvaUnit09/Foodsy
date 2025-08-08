export const dynamic = "force-dynamic";

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

    // Read body without forcing a specific format to avoid parse errors
    let body: BodyInit | undefined = undefined;
    if (method !== "GET" && method !== "HEAD") {
      if (isJson) {
        const json = await request.json().catch(() => ({}));
        body = JSON.stringify(json);
      } else {
        const text = await request.text().catch(() => "");
        body = text;
      }
    }

    const response = await fetch(url, {
      method,
      headers: {
        ...(isJson ? { "Content-Type": "application/json" } : {}),
        ...(auth ? { Authorization: auth } : {}),
        ...(cookies ? { Cookie: cookies } : {}),
      },
      body,
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

