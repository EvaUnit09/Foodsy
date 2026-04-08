import type { NextApiRequest, NextApiResponse } from 'next';
import { IncomingForm, File as FormidableFile } from 'formidable';
import fs from 'fs';

const BACKEND_URL = process.env.BACKEND_URL || 'https://apifoodsy-backend.com';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const authHeader = req.headers['authorization'];

  if (req.method === 'DELETE') {
    try {
      const response = await fetch(`${BACKEND_URL}/auth/me/profile/avatar`, {
        method: 'DELETE',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
      });
      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('Avatar delete proxy error:', error);
      return res.status(500).json({ error: 'Proxy error' });
    }
  }

  if (req.method === 'POST') {
    try {
      const form = new IncomingForm();
      const [, files] = await form.parse(req);
      const fileArray = files.file;
      if (!fileArray || fileArray.length === 0) {
        return res.status(400).json({ error: 'No file provided' });
      }
      const file = fileArray[0] as FormidableFile;

      const fileBuffer = fs.readFileSync(file.filepath);
      const formData = new FormData();
      formData.append('file', new Blob([fileBuffer], { type: file.mimetype || 'image/jpeg' }), file.originalFilename || 'avatar.jpg');

      const response = await fetch(`${BACKEND_URL}/auth/me/profile/avatar`, {
        method: 'POST',
        headers: {
          ...(authHeader ? { Authorization: authHeader } : {}),
        },
        body: formData,
      });

      const data = await response.json();
      return res.status(response.status).json(data);
    } catch (error) {
      console.error('Avatar upload proxy error:', error);
      return res.status(500).json({ error: 'Proxy error' });
    }
  }

  res.status(405).json({ error: 'Method not allowed' });
}
