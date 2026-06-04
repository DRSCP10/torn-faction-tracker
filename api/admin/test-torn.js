import { requireAdmin } from '../../lib/auth.js';
import { tornFetchSafe } from '../../lib/torn.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }
  if (!requireAdmin(req, res)) return;

  try {
    const basic = await tornFetchSafe('/faction/?selections=basic');
    if (!basic.ok) {
      res.status(200).json({ ok: false, step: 'basic', error: basic.error, code: basic.code });
      return;
    }

    const attacks = await tornFetchSafe(
      `/faction/?selections=attacks&from=${Math.floor(Date.now() / 1000) - 3600}&to=${Math.floor(Date.now() / 1000)}`
    );

    const faction = basic.data?.faction || basic.data;
    res.status(200).json({
      ok: true,
      faction: {
        id: faction?.ID ?? faction?.id,
        name: faction?.name,
        respect: faction?.respect,
        members: faction?.members ?? faction?.members_count,
      },
      attacks: attacks.ok
        ? { ok: true, count: Object.keys(attacks.data?.attacks || {}).length }
        : { ok: false, error: attacks.error, code: attacks.code },
      hint: attacks.ok
        ? null
        : 'Enable Faction API Access on the key (attacks/basic/upgrades).',
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message || 'Test failed' });
  }
}
