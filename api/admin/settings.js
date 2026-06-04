import { requireAdmin } from '../../lib/auth.js';
import { readJsonBody } from '../../lib/http.js';
import {
  getSettingsForAdmin,
  updatePublicSettings,
  updateAdminSecrets,
} from '../../lib/settings.js';

export default async function handler(req, res) {
  if (!requireAdmin(req, res)) return;

  try {
    if (req.method === 'GET') {
      res.status(200).json(await getSettingsForAdmin());
      return;
    }

    if (req.method === 'PATCH') {
      const body = await readJsonBody(req);
      const { currentPassword, public: publicPatch } = body;
      if (!currentPassword) {
        res.status(400).json({ error: 'currentPassword required' });
        return;
      }
      const updated = await updatePublicSettings(currentPassword, publicPatch || {});
      res.status(200).json({ ok: true, public: updated });
      return;
    }

    res.status(405).json({ error: 'Method not allowed' });
  } catch (e) {
    res.status(400).json({ error: e.message || 'Request failed' });
  }
}
