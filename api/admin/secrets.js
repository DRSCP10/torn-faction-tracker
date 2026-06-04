import { requireAdmin } from '../../lib/auth.js';
import { readJsonBody } from '../../lib/http.js';
import { updateAdminSecrets } from '../../lib/settings.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const body = await readJsonBody(req);
    const {
      currentPassword,
      newAdminPassword,
      tornApiKey,
      clearTornApiKey,
      botApiSecret,
      clearBotApiSecret,
    } = body;

    if (!currentPassword) {
      res.status(400).json({ error: 'currentPassword required' });
      return;
    }

    await updateAdminSecrets({
      currentPassword,
      newAdminPassword,
      tornApiKey,
      clearTornApiKey,
      botApiSecret,
      clearBotApiSecret,
    });

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Request failed' });
  }
}
