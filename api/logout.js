import { clearAuthCookies } from '../lib/auth.js';

export default function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  res.setHeader('Set-Cookie', clearAuthCookies());
  res.status(200).json({ ok: true });
}
