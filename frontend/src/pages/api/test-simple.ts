import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== SIMPLE TEST ROUTE CALLED ===');
  res.status(200).json({ message: 'Simple test route working' });
} 