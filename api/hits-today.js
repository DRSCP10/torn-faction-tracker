import { allowMemberOrBot } from '../lib/require-member-or-bot.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { getTodayHitsReport } from '../lib/torn.js';
import { parseStatsMode } from '../lib/stats-window.js';
import { loadWarConfig } from '../lib/settings.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;
  if (!(await allowMemberOrBot(req, res))) return;

  try {
    const warConfig = await loadWarConfig();
    const mode = parseStatsMode(req.query?.mode, warConfig);
    const data = await getTodayHitsReport(mode);
    res.status(200).json(data);
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to load hits report' });
  }
}
