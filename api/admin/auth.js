import { checkAdminPassword, createAdminCookie } from '../../lib/auth.js';
import { readJsonBody } from '../../lib/http.js';
import { isAdminConfigured } from '../../lib/settings.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  if (!(await isAdminConfigured())) {
    res.status(503).json({
      error:
        'Admin login not configured. Set ADMIN_PASSWORD in Vercel, or save a password in Admin → Secrets.',
    });
    return;
  }

  const { password } = await readJsonBody(req);
  if (!(await checkAdminPassword(password))) {
    res.status(401).json({ error: 'Invalid admin password' });
    return;
  }

  res.setHeader('Set-Cookie', createAdminCookie());
  res.status(200).json({ ok: true, role: 'admin' });
}
