import { requireAuth } from '../lib/auth.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { getDay } from '../lib/data.js';
import { topByRespect, topChainTimes, underperformers } from '../lib/stats.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  if (!requireAuth(req, res)) return;

  const date = req.query?.date;
  if (!date) {
    res.status(400).json({ error: 'date query required' });
    return;
  }

  try {
    const day = await getDay(date);
    if (!day) {
      res.status(404).json({ error: 'No data for this date' });
      return;
    }

    res.status(200).json({
      ...day,
      analytics: {
        topRespect: topByRespect(day.members || [], 10),
        chains: {
          to10: topChainTimes(day.chains, 10, 3),
          to25: topChainTimes(day.chains, 25, 3),
          to50: topChainTimes(day.chains, 50, 3),
        },
        underperformers: underperformers(day.members || []),
      },
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load day' });
  }
}
