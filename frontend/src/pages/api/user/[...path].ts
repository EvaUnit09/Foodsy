import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

/**
 * Proxies incoming /user/... API requests to the backend, forwarding method, headers, query parameters, and body, and relaying the backend response to the client.
 *
 * Forwards the request to BACKEND_URL/user/{path} while preserving multi-valued query parameters and string headers (excluding `host` and `content-length`). Sets the response status and `Content-Type` to match the backend, returns parsed JSON when the upstream body is JSON or the raw text otherwise, and ends early for 204 No Content. On error, logs the failure and responds with status 500 and `{ error: 'Proxy error' }`.
 *
 * @param req - Incoming Next.js API request; the route segment `path` and remaining query parameters are used to construct the upstream URL.
 * @param res - Next.js API response used to send the upstream response back to the client.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path, ...queryParams } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;

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
