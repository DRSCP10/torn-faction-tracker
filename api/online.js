import { requireAuth } from '../lib/auth.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { getLiveFaction, formatOnlineList } from '../lib/torn.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    const live = await getLiveFaction();
    const chainReady = formatOnlineList(live.members);
    res.status(200).json({
      name: live.name,
      tornDate: live.tornDate,
      online: live.online,
      idle: live.idle,
      chainReady,
      copyText: chainReady
        .map((m) => m.name)
        .join(', '),
      messageTemplate: `Chain up! Need hits — ${chainReady
        .filter((m) => m.status === 'Online')
        .map((m) => m.name)
        .join(', ')} online`,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to fetch online' });
  }
}
