import { requireAuth } from '../lib/auth.js';
import { applyRateLimit } from '../lib/rate-limit.js';
import { getDay } from '../lib/data.js';
import { formatSummaryText } from '../lib/stats.js';

/** Text summary for Discord bot or copy-paste */
export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!applyRateLimit(req, res)) return;

  const botSecret = process.env.BOT_API_SECRET;
  const botKey = req.headers['x-bot-secret'] || req.query?.secret;
  const authedBot = botSecret && botKey === botSecret;
  if (!authedBot && !requireAuth(req, res)) return;

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
    const text = formatSummaryText(day);
    res.status(200).json({ date, text, day });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to build summary' });
  }
}
