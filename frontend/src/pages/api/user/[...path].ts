import type { NextApiRequest, NextApiResponse } from 'next';

// Fail fast if BACKEND_URL is not configured — prevents local/preview traffic
// from silently routing to production.
const BACKEND_URL = process.env.BACKEND_URL;

// Explicit allowlist of permitted path shapes.
// Segments are matched after splitting on '/'.
const ALLOWED_PATHS = [
  /^library\/(favorites|watchlist)$/,
  /^library\/(favorites|watchlist)\/[A-Za-z0-9_\-%.]+$/,
];

function isAllowedPath(apiPath: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(apiPath));
}

const UPSTREAM_TIMEOUT_MS = 10_000;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (!BACKEND_URL) {
    console.error('BACKEND_URL environment variable is not set');
    return res.status(500).json({ error: 'Server misconfiguration: BACKEND_URL not set' });
  }

  const { path, ...queryParams } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : (path ?? '');

  if (!isAllowedPath(apiPath)) {
    return res.status(404).json({ error: 'Not found' });
  }

  const qs = new URLSearchParams(
    Object.entries(queryParams).flatMap(([k, v]) =>
      Array.isArray(v) ? v.map((val) => [k, val]) : [[k, v as string]]
    )
  ).toString();
  const upstreamUrl = `${BACKEND_URL}/user/${apiPath}${qs ? `?${qs}` : ''}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      if (key !== 'host' && key !== 'content-length') {
        const value = req.headers[key];
        if (typeof value === 'string') headers[key] = value;
      }
    });

    const upstream = await fetch(upstreamUrl, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
      signal: controller.signal,
    });

    clearTimeout(timer);

    const contentType = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (contentType) res.setHeader('Content-Type', contentType);

    if (upstream.status === 204) {
      res.end();
      return;
    }

    const text = await upstream.text();
    try {
      res.json(JSON.parse(text));
    } catch {
      res.send(text);
    }
  } catch (error) {
    clearTimeout(timer);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`API Proxy timeout for /user/${apiPath}`);
      return res.status(504).json({ error: 'Upstream request timed out' });
    }
    console.error(`API Proxy error for /user/${apiPath}:`, error);
    res.status(500).json({ error: 'Proxy error' });
  }
}
