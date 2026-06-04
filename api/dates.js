import { allowMemberOrBot } from '../lib/require-member-or-bot.js';
import { getDates } from '../lib/data.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!(await allowMemberOrBot(req, res))) return;

  try {
    const dates = await getDates();
    res.status(200).json({ dates });
  } catch (e) {
    res.status(500).json({ error: e.message || 'Failed to list dates' });
  }
}
