import { requireAuth } from '../lib/auth.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { loadIndex } from '../lib/data.js';
import { getDates, getDay } from '../lib/data.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  if (!requireAuth(req, res)) return;

  try {
    const index = await loadIndex();
    if (index?.alltime?.length) {
      res.status(200).json({
        members: index.alltime,
        dayCount: index.dayCount,
        updatedAt: index.updatedAt,
      });
      return;
    }

    const dates = await getDates();
    const totals = {};
    for (const date of dates) {
      const day = await getDay(date);
      if (!day) continue;
      for (const m of day.members || []) {
        const key = String(m.id || m.name);
        if (!totals[key]) {
          totals[key] = {
            id: m.id,
            name: m.name,
            respect: 0,
            hits: 0,
            assists: 0,
            losses: 0,
            chainHits: 0,
            chainRespect: 0,
            activeDays: 0,
          };
        }
        const t = totals[key];
        t.respect += m.respect || 0;
        t.hits += m.hits || 0;
        t.assists += m.assists || 0;
        t.losses += m.losses || 0;
        t.chainHits += m.chainHits || 0;
        t.chainRespect += m.chainRespect || 0;
        if ((m.hits || 0) > 0) t.activeDays++;
      }
    }

    const members = Object.values(totals)
      .map((m) => ({
        ...m,
        respect: +m.respect.toFixed(2),
        avgHit: m.hits > 0 ? +(m.respect / m.hits).toFixed(2) : 0,
        chainAvgHit:
          m.chainHits > 0 ? +(m.chainRespect / m.chainHits).toFixed(2) : 0,
      }))
      .sort((a, b) => b.respect - a.respect);

    res.status(200).json({ members, dayCount: dates.length });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load all-time' });
  }
}
