import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log(`Test endpoint called`);
  console.log(`Backend URL: ${BACKEND_URL}`);
  
  try {
    // Test a simple GET request to the backend
    const response = await fetch(`${BACKEND_URL}/auth/test`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log(`Backend test response status: ${response.status}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Backend test error: ${errorText}`);
      return res.status(response.status).json({ 
        error: `Backend test failed: ${response.status}`, 
        details: errorText,
        backendUrl: BACKEND_URL
      });
    }

    const data = await response.json();
    console.log(`Backend test successful:`, data);
    
    res.status(200).json({ 
      message: 'Backend connection successful',
      backendUrl: BACKEND_URL,
      backendResponse: data
    });
  } catch (error) {
    console.error(`Backend test error:`, error);
    res.status(500).json({ 
      error: 'Backend test failed', 
      details: error instanceof Error ? error.message : 'Unknown error',
      backendUrl: BACKEND_URL
    });
  }
} 