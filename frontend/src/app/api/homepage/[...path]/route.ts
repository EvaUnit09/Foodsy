export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_URL || "https://apifoodsy-backend.com";

async function proxy(request: Request, { params }: { params: Promise<{ path: string[] }> }): Promise<Response> {
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

    // Build the backend path from the dynamic route params
    const resolvedParams = await params;
    const subpath = resolvedParams.path ? resolvedParams.path.join('/') : '';
    const backendPath = `/homepage/${subpath}`;

    console.log(`App API Proxy: ${request.method} ${backendPath}`);

    const response = await fetch(`${BACKEND_URL}${backendPath}`, {
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
    
    console.log(`App API Proxy: ${status} response for ${backendPath}`);
    
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
    console.error("App API homepage proxy error:", error);
    return new Response(JSON.stringify({ error: "Proxy error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export function GET(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export function POST(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export function PUT(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}

export function DELETE(request: Request, context: { params: Promise<{ path: string[] }> }) {
  return proxy(request, context);
}