import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('=== AUTH TEST ROUTE CALLED ===');
  res.status(200).json({ message: 'Auth test route working' });
} 

// Minimal test to satisfy Jest when this file is picked up as a test suite
// Ensures there is at least one test.
if (process.env.JEST_WORKER_ID !== undefined) {
  describe('auth test route module', () => {
    it('exports a default handler function', () => {
      expect(typeof handler).toBe('function');
    });
  });
}