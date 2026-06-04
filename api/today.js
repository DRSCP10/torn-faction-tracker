import { requireAuth } from '../lib/auth.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { isBotAuthed } from '../lib/bot-auth.js';
import { getFactionLiveStats } from '../lib/torn.js';
import { parseStatsMode } from '../lib/stats-window.js';
import { loadWarConfig } from '../lib/settings.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  const authedBot = await isBotAuthed(req);
  if (!authedBot && !requireAuth(req, res)) return;

  try {
    const warConfig = await loadWarConfig();
    const mode = parseStatsMode(req.query?.mode, warConfig);
    const live = await getFactionLiveStats(mode);

    const roster = live.members.filter(
      (m) => !String(m.id).startsWith('stealth:')
    );
    const topHitters = [...roster]
      .filter((m) => m.hits > 0)
      .sort((a, b) => b.hits - a.hits || b.respect - a.respect)
      .slice(0, 10)
      .map((m) => ({
        name: m.name,
        hits: m.hits,
        respect: m.respect,
      }));

    res.status(200).json({
      name: live.name,
      statsMode: live.statsMode,
      dayWindow: live.dayWindow,
      dayBounds: live.dayBounds,
      calendarDate: live.calendarDate,
      warLabel: live.warLabel,
      totals: live.totals,
      topHitters,
      inactiveHitters: live.inactiveHitters,
      hitsReportUrl: live.hitsReportUrl,
      hitsReportPath: live.hitsReportPath,
      updatedAt: live.updatedAt,
    });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to fetch today stats' });
  }
}
