import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path } = req.query;
  const apiPath = Array.isArray(path) ? path.join('/') : path;
  
  console.log(`API Proxy: ${req.method} /auth/${apiPath}`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  
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
    
    console.log(`Forwarding to: ${BACKEND_URL}/auth/${apiPath}`);
    console.log(`Headers:`, headers);
    
    // Forward the request to the AWS backend
    const response = await fetch(`${BACKEND_URL}/auth/${apiPath}`, {
      method: req.method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: req.method !== 'GET' && req.body ? JSON.stringify(req.body) : undefined,
    });

    console.log(`Backend response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend error response: ${errorText}`);
      return res.status(response.status).json({ 
        error: `Backend error: ${response.status}`, 
        details: errorText 
      });
    }

    const data = await response.json();
    console.log(`API Proxy: ${response.status} response for /auth/${apiPath}`);
    
    res.status(response.status).json(data);
  } catch (error) {
    console.error(`API Proxy error for /auth/${apiPath}:`, error);
    console.error(`Error details:`, error instanceof Error ? error.message : error);
    res.status(500).json({ 
      error: 'Proxy error', 
      details: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: BACKEND_URL
    });
  }
} 