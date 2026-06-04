import { memberStatsFromAttacks } from './compute.js';
import { parseUpgradeProgress } from './upgrades.js';
import { tornDayBounds, getCurrentTornDate } from './torn-day.js';

const BASE = 'https://api.torn.com';

export async function tornFetch(path) {
  const key = process.env.TORN_API_KEY;
  if (!key) throw new Error('TORN_API_KEY not configured');
  const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}key=${key}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.error);
  return data;
}

export async function getLiveFaction() {
  const tornDate = getCurrentTornDate();
  const { fromTs, toTs } = tornDayBounds(tornDate);

  const [basic, attacks] = await Promise.all([
    tornFetch('/faction/?selections=basic'),
    tornFetch(`/faction/?selections=attacks&from=${fromTs}&to=${toTs}`),
  ]);

  let upgrades = null;
  try {
    upgrades = await tornFetch('/faction/?selections=upgrades');
  } catch {
    /* upgrades selection may be unavailable on some keys */
  }

  const { members: stats, bestHit } = memberStatsFromAttacks(
    attacks.attacks,
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
  return members
    .filter((m) => m.status === 'Online' || m.status === 'Idle')
    .sort((a, b) => {
      const order = { Online: 0, Idle: 1 };
      return (order[a.status] ?? 2) - (order[b.status] ?? 2);
    });
}
