import { checkAdminPassword, createAdminCookie } from '../../lib/auth.js';
import { readJsonBody } from '../../lib/http.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!process.env.ADMIN_PASSWORD) {
    res.status(503).json({ error: 'Admin login not configured (set ADMIN_PASSWORD)' });
    return;
  }

  const { password } = await readJsonBody(req);
  if (!checkAdminPassword(password)) {
    res.status(401).json({ error: 'Invalid admin password' });
    return;
  }

  res.setHeader('Set-Cookie', createAdminCookie());
  res.status(200).json({ ok: true, role: 'admin' });
}
