import type { NextApiRequest, NextApiResponse } from 'next';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { borough } = req.query;

  try {
    const response = await fetch(`${BACKEND_URL}/neighborhoods?borough=${encodeURIComponent(borough as string)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(response.status).json({ error: errorText });
    }

    const data = await response.json();
    res.status(200).json(data);
  } catch (error) {
    console.error('Neighborhoods proxy error:', error);
    res.status(500).json({ error: 'Proxy error' });
  }
}
