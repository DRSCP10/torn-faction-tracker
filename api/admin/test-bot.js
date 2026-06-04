import { requireAdmin } from '../../lib/auth.js';
import { getAppUrl, getBotApiSecret } from '../../lib/settings.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const appUrl = await getAppUrl();
    const botSecret = await getBotApiSecret();

    if (!appUrl) {
      res.status(200).json({ ok: false, error: 'APP_URL not configured' });
      return;
    }

    const headers = botSecret ? { 'x-bot-secret': botSecret } : {};
    const ping = await fetch(`${appUrl}/api/summary?date=2099-01-01`, { headers });
    const authed = ping.status !== 401;

    res.status(200).json({
      ok: authed,
      appUrl,
      hasSecret: Boolean(botSecret),
      status: ping.status,
      hint: authed
        ? 'Bot auth accepted (404 for fake date is OK).'
        : 'Set BOT_API_SECRET on Vercel and in Admin → Secrets, or log in would be required.',
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Test failed' });
  }
}
