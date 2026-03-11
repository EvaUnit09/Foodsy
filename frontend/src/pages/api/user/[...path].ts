import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

// Explicit allowlist of permitted path shapes.
// Segments are matched after splitting on '/'.
const ALLOWED_PATHS = [
  /^library\/(favorites|watchlist)$/,
  /^library\/(favorites|watchlist)\/[A-Za-z0-9_\-%.]+$/,
];

function isAllowedPath(apiPath: string): boolean {
  return ALLOWED_PATHS.some((pattern) => pattern.test(apiPath));
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
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
    });

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
    console.error(`API Proxy error for /user/${apiPath}:`, error);
    res.status(500).json({ error: 'Proxy error' });
  }
}
