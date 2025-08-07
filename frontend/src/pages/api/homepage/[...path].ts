import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : (path || '');
  
  console.log(`API Proxy: ${req.method} /homepage/${apiPath}`);
  
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
    // Handle both /homepage and /homepage/subpath
    const backendPath = apiPath ? `/homepage/${apiPath}` : '/homepage';
    const response = await fetch(`${BACKEND_URL}${backendPath}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    const data = await response.json();
    console.log(`API Proxy: ${response.status} response for ${backendPath}`);
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`API Proxy error for /homepage/${apiPath}:`, error);
    res.status(500).json({ error: 'Proxy error' });
  }
} 