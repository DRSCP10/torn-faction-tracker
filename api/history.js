import { allowMemberOrBot } from '../lib/require-member-or-bot.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { loadIndex } from '../lib/data.js';
import { getDates, getDay } from '../lib/data.js';
import { buildDaySummary } from '../lib/index-store.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  if (!(await allowMemberOrBot(req, res))) return;

  const limit = Math.min(60, parseInt(req.query?.limit || '14', 10));
  const includeMembers = req.query?.members === '1';

  try {
    const index = await loadIndex();
    if (index?.days) {
      const recent = index.dates.slice(-limit);
      const days = recent.map((d) => {
        const summary = index.days[d];
        if (includeMembers) return null;
        return summary;
      });
      if (!includeMembers) {
        res.status(200).json({
          days: days.filter(Boolean),
          dayCount: index.dayCount,
          updatedAt: index.updatedAt,
        });
        return;
      }
    }

    const dates = await getDates();
    const recent = dates.slice(-limit);
    const days = await Promise.all(recent.map((d) => getDay(d)));
    const summary = days.filter(Boolean).map((day) => {
      const s = buildDaySummary(day);
      if (includeMembers) return { ...s, members: day.members };
      return s;
    });
    res.status(200).json({ days: summary });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load history' });
  }
}
