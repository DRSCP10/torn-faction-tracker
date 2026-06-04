import { createMemberCookie } from '../lib/auth.js';
import { readJsonBody } from '../lib/http.js';
import { loadAccessList, isUserAllowed } from '../lib/access.js';
import { getUserFromApiKey } from '../lib/torn-user.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { apiKey } = await readJsonBody(req);

  if (!apiKey) {
    res.status(400).json({ error: 'Torn API key required' });
    return;
  }

  try {
    const tornUser = await getUserFromApiKey(apiKey);
    const access = await loadAccessList();

    if (!isUserAllowed(access, tornUser)) {
      res.status(403).json({
        error: `Access denied. "${tornUser.name}" is not on the allowlist. Ask an officer for access.`,
        code: 'not_allowed',
        tornUser: { id: tornUser.id, name: tornUser.name },
      });
      return;
    }

    res.setHeader('Set-Cookie', createMemberCookie(tornUser.id));
    res.status(200).json({
      ok: true,
      user: { id: tornUser.id, name: tornUser.name },
    });
  } catch (e) {
    res.status(401).json({ error: e.message || 'Login failed' });
  }
}
