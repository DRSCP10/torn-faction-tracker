import { requireAuth } from '../lib/auth.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { getDay } from '../lib/data.js';
import { compareDays } from '../lib/stats.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  if (!requireAuth(req, res)) return;

  const dateA = req.query?.dateA || req.query?.a;
  const dateB = req.query?.dateB || req.query?.b;
  if (!dateA || !dateB) {
    res.status(400).json({ error: 'dateA and dateB required' });
    return;
  }

  try {
    const [dayA, dayB] = await Promise.all([getDay(dateA), getDay(dateB)]);
    if (!dayA || !dayB) {
      res.status(404).json({ error: 'Missing data for one or both dates' });
      return;
    }
    res.status(200).json(compareDays(dayA, dayB));
  } catch (e) {
    res.status(500).json({ error: e.message || 'Compare failed' });
  }
}
