import { memberStatsFromAttacks } from './compute.js';
import { parseUpgradeProgress } from './upgrades.js';
import { tornDayBounds, getCurrentTornDate } from './torn-day.js';
import { throwIfTornError, formatTornError } from './torn-errors.js';

const BASE = 'https://api.torn.com';

async function resolveTornApiKey() {
  const { getTornApiKey } = await import('./settings.js');
  const key = await getTornApiKey();
  if (!key) throw new Error('TORN_API_KEY not configured on server');
  return key;
}

export async function tornFetch(path) {
  const key = await resolveTornApiKey();
  const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}key=${key}`);
  const data = await res.json();
  throwIfTornError(data);
  return data;
}

export async function tornFetchSafe(path) {
  const key = await resolveTornApiKey();
  const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}key=${key}`);
  const data = await res.json();
  if (data?.error) {
    return { ok: false, error: formatTornError(data), code: data.error.code, data: null };
  }
  return { ok: true, data, error: null, code: null };
}

export async function getLiveFaction() {
  const tornDate = getCurrentTornDate();
  const { fromTs, toTs } = tornDayBounds(tornDate);
  const warnings = [];

  const basicResult = await tornFetchSafe('/faction/?selections=basic');
  if (!basicResult.ok) {
    throw new Error(basicResult.error);
  }
  const basic = basicResult.data;

  let attacksPayload = {};
  const attacksResult = await tornFetchSafe(
    `/faction/?selections=attacks&from=${fromTs}&to=${toTs}`
  );
  if (attacksResult.ok) {
    attacksPayload = attacksResult.data.attacks || {};
  } else {
    warnings.push(`Live attacks: ${attacksResult.error}`);
  }

  let upgrades = null;
  const upgradesResult = await tornFetchSafe('/faction/?selections=upgrades');
  if (upgradesResult.ok) {
    upgrades = upgradesResult.data;
  } else if (upgradesResult.code !== 7 && upgradesResult.code !== 16) {
    warnings.push(`Upgrades: ${upgradesResult.error}`);
  }

  const { members: stats, bestHit } = memberStatsFromAttacks(
    attacksPayload,
    basic.members
  );

  const liveMembers = stats.map((m) => {
    const raw = Object.entries(basic.members || {}).find(
      ([id]) => String(id) === String(m.id)
    )?.[1];
    return {
      ...m,
      profileUrl: `https://www.torn.com/profiles.php?XID=${m.id}`,
      messageUrl: `https://www.torn.com/messages.php?action=compose&XID=${m.id}`,
      status: raw?.last_action?.status || 'Offline',
      lastAction: raw?.last_action?.relative || 'Unknown',
    };
  });

  const online = liveMembers.filter((m) => m.status === 'Online');
  const idle = liveMembers.filter((m) => m.status === 'Idle');
  const perkProgress = parseUpgradeProgress(basic, upgrades);

  return {
    name: basic.name,
    id: basic.ID,
    respect: basic.respect || 0,
    rank: basic.rank,
    tornDate,
    perkProgress,
    members: liveMembers,
    online,
    idle,
    warnings,
    totals: {
      respect: +liveMembers.reduce((s, m) => s + m.respect, 0).toFixed(2),
      hits: liveMembers.reduce((s, m) => s + m.hits, 0),
      assists: liveMembers.reduce((s, m) => s + m.assists, 0),
      losses: liveMembers.reduce((s, m) => s + m.losses, 0),
      chainHits: liveMembers.reduce((s, m) => s + (m.chainHits || 0), 0),
    },
    bestHitToday: bestHit.respect > 0 ? bestHit : null,
    updatedAt: new Date().toISOString(),
  };
}

export function formatOnlineList(members) {
  return [...members]
    .filter((m) => m.status === 'Online' || m.status === 'Idle')
    .sort((a, b) => {
      const order = { Online: 0, Idle: 1 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });
}
