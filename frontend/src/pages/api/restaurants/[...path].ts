import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  console.log(`API Proxy: ${req.method} /restaurants/${apiPath}`);
  
  try {
    // Prepare headers, excluding host and content-length. Don't force Content-Type; let upstream decide.
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach((key) => {
      if (key !== 'host' && key !== 'content-length') {
        const value = req.headers[key];
        if (typeof value === 'string') headers[key] = value;
      }
    });

    const upstream = await fetch(`${BACKEND_URL}/restaurants/${apiPath}`, {
      method: req.method,
      headers,
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    const contentType = upstream.headers.get('content-type') || '';
    res.status(upstream.status);
    if (contentType) res.setHeader('Content-Type', contentType);

    if (contentType.startsWith('image/')) {
      // Stream binary image bytes directly
      const arrayBuffer = await upstream.arrayBuffer();
      res.send(Buffer.from(arrayBuffer));
      return;
    }

    // Default: JSON/text
    const text = await upstream.text();
    try {
      const json = JSON.parse(text);
      res.json(json);
    } catch {
      res.send(text);
    }
  } catch (error) {
    console.error(`API Proxy error for /restaurants/${apiPath}:`, error);
    res.status(500).json({ error: 'Proxy error' });
  }
} 