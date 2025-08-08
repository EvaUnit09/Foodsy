export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "https://apifoodsy-backend.com";

async function proxy(request: Request): Promise<Response> {
  try {
    const auth = request.headers.get("authorization");
    const cookies = request.headers.get("cookie");
    const contentType = request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    let body: BodyInit | undefined = undefined;
    if (request.method !== "GET" && request.method !== "HEAD") {
      if (isJson) {
        const json = await request.json().catch(() => ({}));
        body = JSON.stringify(json);
      } else {
        const text = await request.text().catch(() => "");
        body = text;
      }
    }

    const response = await fetch(`${BACKEND_URL}/homepage`, {
      method: request.method,
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
    console.error("Route /api/homepage proxy error:", error);
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export function GET(request: Request) {
  return proxy(request);
}

export function POST(request: Request) {
  return proxy(request);
}

export function PUT(request: Request) {
  return proxy(request);
}

export function DELETE(request: Request) {
  return proxy(request);
}

