import {
  memberStatsFromAttacks,
  STEALTH_INCOMING_LABEL,
} from './compute.js';
import { parseUpgradeProgress } from './upgrades.js';
import {
  getCalendarDayWindowLabel,
  formatTctDateTime,
  TCT_LABEL,
} from './torn-day.js';
import { fetchAllFactionAttacks } from './torn-attacks.js';
import {
  buildHitsReportRows,
  summarizeHitsReport,
} from './hits-report.js';
import { throwIfTornError, formatTornError } from './torn-errors.js';
import { resolveStatsWindow, parseStatsMode } from './stats-window.js';
import { listMembersWithoutHits } from './inactive-hitters.js';
import { loadWarConfig } from './settings.js';

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

async function fetchFactionAttacksForWindow(fromTs, toTs) {
  const warnings = [];
  let attacksPayload = {};
  let attacksMeta = null;
  const attacksResult = await fetchAllFactionAttacks(fromTs, toTs, tornFetchSafe);
  if (attacksResult.ok) {
    attacksPayload = attacksResult.attacks;
    attacksMeta = {
      count: attacksResult.count,
      apiCalls: attacksResult.apiCalls,
    };
    warnings.push(...attacksResult.warnings);
  } else {
    attacksPayload = attacksResult.attacks || {};
    warnings.push(`Live attacks: ${attacksResult.error}`);
  }
  return { attacksPayload, attacksMeta, warnings };
}

function buildLiveMembers(basic, stats) {
  const rosterIds = new Set(Object.keys(basic.members || {}));
  return stats
    .filter((m) => rosterIds.has(String(m.id)) || String(m.id).startsWith('stealth:'))
    .map((m) => {
      const raw = Object.entries(basic.members || {}).find(
        ([id]) => String(id) === String(m.id)
      )?.[1];
      return {
        ...m,
        profileUrl: rosterIds.has(String(m.id))
          ? `https://www.torn.com/profiles.php?XID=${m.id}`
          : null,
        messageUrl: rosterIds.has(String(m.id))
          ? `https://www.torn.com/messages.php?action=compose&XID=${m.id}`
          : null,
        status: raw?.last_action?.status || 'Offline',
        lastAction: raw?.last_action?.relative || 'Unknown',
        stealthIncomingLabel:
          (m.stealthAttacksOnUs || 0) > 0 ? STEALTH_INCOMING_LABEL : null,
      };
    });
}

function computeTotals(liveMembers, rosterIds) {
  return {
    respect: +liveMembers
      .filter((m) => rosterIds.has(String(m.id)))
      .reduce((s, m) => s + m.respect, 0)
      .toFixed(2),
    hits: liveMembers
      .filter(
        (m) =>
          rosterIds.has(String(m.id)) || String(m.id).startsWith('stealth:')
      )
      .reduce((s, m) => s + m.hits, 0),
    assists: liveMembers
      .filter((m) => rosterIds.has(String(m.id)))
      .reduce((s, m) => s + m.assists, 0),
    losses: liveMembers
      .filter((m) => rosterIds.has(String(m.id)))
      .reduce((s, m) => s + m.losses, 0),
    chainHits: liveMembers
      .filter((m) => rosterIds.has(String(m.id)))
      .reduce((s, m) => s + (m.chainHits || 0), 0),
  };
}

export async function getFactionLiveStats(modeInput = 'calendar') {
  const warConfig = await loadWarConfig();
  const mode = parseStatsMode(modeInput, warConfig);
  const window = resolveStatsWindow(mode, warConfig);
  const warnings = [];

  const basicResult = await tornFetchSafe('/faction/?selections=basic');
  if (!basicResult.ok) {
    throw new Error(basicResult.error);
  }
  const basic = basicResult.data;

  const { attacksPayload, attacksMeta, warnings: attackWarnings } =
    await fetchFactionAttacksForWindow(window.fromTs, window.toTs);
  warnings.push(...attackWarnings);

  let upgrades = null;
  const upgradesResult = await tornFetchSafe('/faction/?selections=upgrades');
  if (upgradesResult.ok) {
    upgrades = upgradesResult.data;
  } else if (upgradesResult.code !== 7 && upgradesResult.code !== 16) {
    warnings.push(`Upgrades: ${upgradesResult.error}`);
  }

  const rosterIds = new Set(Object.keys(basic.members || {}));
  const { members: stats, bestHits, stealthAttacksOnUs } = memberStatsFromAttacks(
    attacksPayload,
    basic.members,
    basic.ID
  );

  const liveMembers = buildLiveMembers(basic, stats);
  const online = liveMembers.filter((m) => m.status === 'Online');
  const idle = liveMembers.filter((m) => m.status === 'Idle');
  const perkProgress = parseUpgradeProgress(basic, upgrades);
  const totals = {
    ...computeTotals(liveMembers, rosterIds),
    stealthAttacksOnUs,
  };

  const inactiveHitters = listMembersWithoutHits(basic.members, stats, {
    mode: window.mode,
    warStartedAt: window.warStartedAt,
    inactiveAfterHours: warConfig.inactiveAfterHours,
  });

  const { getAppUrl } = await import('./settings.js');
  const appUrl = await getAppUrl();
  const hitsReportPath = `/hits-today?mode=${window.mode}`;
  const hitsReportUrl = appUrl ? `${appUrl}${hitsReportPath}` : hitsReportPath;

  return {
    name: basic.name,
    id: basic.ID,
    respect: basic.respect || 0,
    rank: basic.rank,
    statsMode: window.mode,
    calendarDate: window.calendarDate,
    tornDate: window.calendarDate || window.dayBounds.from.slice(0, 10),
    dayMode: window.mode,
    dayWindow: window.dayWindow,
    tornDayWindow: window.dayWindow,
    dayBounds: window.dayBounds,
    tornDayBounds: window.dayBounds,
    warStartedAt: window.warStartedAt,
    warLabel: window.warLabel,
    warActive: window.warActive,
    warConfigured: Boolean(warConfig.warStartedAt),
    hitsReportUrl,
    hitsReportPath,
    attacksMeta,
    tctNow: formatTctDateTime(),
    tctLabel: TCT_LABEL,
    perkProgress,
    members: liveMembers,
    online,
    idle,
    inactiveHitters,
    warnings,
    totals,
    stealthIncomingLabel: STEALTH_INCOMING_LABEL,
    bestHitsToday: bestHits.length ? bestHits : null,
    bestHitToday: bestHits[0] || null,
    updatedAt: new Date().toISOString(),
  };
}

/** @deprecated Use getFactionLiveStats */
export async function getLiveFaction(mode) {
  return getFactionLiveStats(mode);
}

export async function getTodayHitsReport(modeInput = 'calendar') {
  const warConfig = await loadWarConfig();
  const mode = parseStatsMode(modeInput, warConfig);
  const window = resolveStatsWindow(mode, warConfig);
  const warnings = [];

  const basicResult = await tornFetchSafe('/faction/?selections=basic');
  if (!basicResult.ok) {
    throw new Error(basicResult.error);
  }
  const basic = basicResult.data;

  const { attacksPayload, attacksMeta, warnings: attackWarnings } =
    await fetchFactionAttacksForWindow(window.fromTs, window.toTs);
  warnings.push(...attackWarnings);

  const rows = buildHitsReportRows(attacksPayload, basic.members, basic.ID);
  const summary = summarizeHitsReport(rows);
  const rosterIds = new Set(Object.keys(basic.members || {}));
  const { members: stats, stealthAttacksOnUs } = memberStatsFromAttacks(
    attacksPayload,
    basic.members,
    basic.ID
  );
  const offensiveHits = stats
    .filter(
      (m) => rosterIds.has(String(m.id)) || String(m.id).startsWith('stealth:')
    )
    .reduce((s, m) => s + m.hits, 0);

  const inactiveHitters = listMembersWithoutHits(basic.members, stats, {
    mode: window.mode,
    warStartedAt: window.warStartedAt,
    inactiveAfterHours: warConfig.inactiveAfterHours,
  });

  const { getAppUrl } = await import('./settings.js');
  const appUrl = await getAppUrl();

  return {
    factionName: basic.name,
    factionId: basic.ID,
    statsMode: window.mode,
    calendarDate: window.calendarDate,
    dayWindow: window.dayWindow,
    dayBounds: window.dayBounds,
    warStartedAt: window.warStartedAt,
    warLabel: window.warLabel,
    warConfigured: Boolean(warConfig.warStartedAt),
    tctNow: formatTctDateTime(),
    tctLabel: TCT_LABEL,
    summary: { ...summary, offensiveHits },
    rows,
    warnings,
    attacksMeta,
    stealthIncomingLabel: STEALTH_INCOMING_LABEL,
    inactiveHitters,
    updatedAt: new Date().toISOString(),
    totals: {
      hits: offensiveHits,
      stealthAttacksOnUs,
    },
    dashboardUrl: appUrl || '/',
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
