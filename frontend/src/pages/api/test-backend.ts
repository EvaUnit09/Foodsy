import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`Test endpoint called`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  try {
    // Test the auth/refresh endpoint specifically
    const response = await fetch(`${BACKEND_URL}/auth/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Backend auth/refresh response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend auth/refresh error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `Backend auth/refresh failed: ${response.status}`, 
        details: errorText,
        backendUrl: BACKEND_URL
      });
    }

    const data = await response.json();
    console.log(`Backend auth/refresh successful:`, data);
    
    res.status(200).json({ 
      message: 'Backend auth/refresh connection successful',
      backendUrl: BACKEND_URL,
      backendResponse: data
    });
  } catch (error) {
    console.error(`Backend auth/refresh error:`, error);
    res.status(500).json({ 
      error: 'Backend auth/refresh failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: BACKEND_URL
    });
  }
} 