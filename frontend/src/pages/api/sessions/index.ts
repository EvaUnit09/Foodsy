import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`API Proxy: ${req.method} /sessions`);

  try {
    // Prepare headers, excluding host and content-length
    const headers: Record<string, string> = {};
    Object.keys(req.headers).forEach(key => {
      if (key !== 'host' && key !== 'content-length') {
        const value = req.headers[key];
        if (typeof value === 'string') {
          headers[key] = value;
        }
      }
    });

    // Forward the request to the backend root /sessions
    const response = await fetch(`${BACKEND_URL}/sessions`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    // Try to parse JSON, fall back to text
    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    res.status(response.status).send(data as any);
  } catch (error) {
    console.error(`API Proxy error for /sessions:`, error);
    res.status(500).json({ error: 'Proxy error' });
  }
}

