import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  console.log(`API Proxy: ${req.method} /sessions/${apiPath}`);
  
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
    
    // Forward the request to the AWS backend
    const response = await fetch(`${BACKEND_URL}/sessions/${apiPath}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    console.log(`API Proxy: ${response.status} response for /sessions/${apiPath}`);
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`API Proxy error for /sessions/${apiPath}:`, error);
    res.status(500).json({ error: 'Proxy error' });
  }
} 