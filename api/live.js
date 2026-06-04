import { requireAuth } from '../lib/auth.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { getLiveFaction } from '../lib/torn.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    const data = await getLiveFaction();
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to fetch live data' });
  }
}
