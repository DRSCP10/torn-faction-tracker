import { getDataMode, getRemoteConfig } from './config.js';

async function lib(subpath) {
  return import(`../lib/${subpath}`);
}

function remoteHeaders() {
  const { botSecret } = getRemoteConfig();
  return botSecret ? { 'x-bot-secret': botSecret } : {};
}

async function fetchRemote(path) {
  const { appUrl } = getRemoteConfig();
  if (!appUrl) return { ok: false, error: 'APP_URL not set', data: null };
  const url = `${appUrl}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, { headers: remoteHeaders() });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { ok: false, error: data.error || res.statusText, data: null };
  }
  return { ok: true, data, error: null };
}

export async function getLiveStats(mode = 'calendar') {
  if (getDataMode() === 'local') {
    const { getFactionLiveStats } = await lib('torn.js');
    return { ok: true, data: await getFactionLiveStats(mode) };
  }
  return fetchRemote(`/api/live?mode=${encodeURIComponent(mode)}`);
}

export async function getTodaySummary(mode = 'calendar') {
  if (getDataMode() === 'local') {
    const { getFactionLiveStats } = await lib('torn.js');
    const live = await getFactionLiveStats(mode);
    const roster = live.members.filter((m) => !String(m.id).startsWith('stealth:'));
    return {
      ok: true,
      data: {
        name: live.name,
        statsMode: live.statsMode,
        dayWindow: live.dayWindow,
        dayBounds: live.dayBounds,
        totals: live.totals,
        topHitters: [...roster]
          .filter((m) => m.hits > 0)
          .sort((a, b) => b.hits - a.hits)
          .slice(0, 10)
          .map((m) => ({ name: m.name, hits: m.hits, respect: m.respect })),
        inactiveHitters: live.inactiveHitters,
        hitsReportUrl: live.hitsReportUrl,
        hitsReportPath: live.hitsReportPath,
        bestHitsToday: live.bestHitsToday,
        perkProgress: live.perkProgress,
        online: live.online,
        idle: live.idle,
      },
    };
  }
  return fetchRemote(`/api/today?mode=${encodeURIComponent(mode)}`);
}

export async function getOnline() {
  if (getDataMode() === 'local') {
    const { getFactionLiveStats, formatOnlineList } = await lib('torn.js');
    const live = await getFactionLiveStats();
    const chainReady = formatOnlineList(live.members);
    return {
      ok: true,
      data: {
        name: live.name,
        tornDate: live.calendarDate || live.tornDate,
        online: live.online,
        idle: live.idle,
        chainReady,
        copyText: chainReady.map((m) => m.name).join(', '),
        messageTemplate: `Chain up! ${chainReady
          .filter((m) => m.status === 'Online')
          .map((m) => m.name)
          .join(', ')} online`,
      },
    };
  }
  return fetchRemote('/api/online');
}

export async function getHitsReport(mode = 'calendar') {
  if (getDataMode() === 'local') {
    const { getTodayHitsReport } = await lib('torn.js');
    return { ok: true, data: await getTodayHitsReport(mode) };
  }
  return fetchRemote(`/api/hits-today?mode=${encodeURIComponent(mode)}`);
}

export async function getSummary(date) {
  if (getDataMode() === 'local') {
    const { getDay } = await lib('data.js');
    const { formatSummaryText } = await lib('stats.js');
    const day = await getDay(date);
    if (!day) return { ok: false, error: `No data for ${date}`, data: null };
    return { ok: true, data: { date, text: formatSummaryText(day), day } };
  }
  return fetchRemote(`/api/summary?date=${encodeURIComponent(date)}`);
}

export async function getDates() {
  if (getDataMode() === 'local') {
    const { getDates: list } = await lib('data.js');
    return { ok: true, data: { dates: await list() } };
  }
  return fetchRemote('/api/dates');
}

export async function getDay(date) {
  if (getDataMode() === 'local') {
    const { getDay: load } = await lib('data.js');
    const { topByRespect, underperformers } = await lib('stats.js');
    const { loadSettings, getAnalyticsOptions } = await lib('settings.js');
    const day = await load(date);
    if (!day) return { ok: false, error: `No data for ${date}`, data: null };
    const settings = await loadSettings();
    const opts = getAnalyticsOptions(settings);
    return {
      ok: true,
      data: {
        ...day,
        analytics: {
          topRespect: topByRespect(day.members || [], 10),
          underperformers: underperformers(day.members || [], opts),
        },
      },
    };
  }
  return fetchRemote(`/api/day?date=${encodeURIComponent(date)}`);
}

export async function getHistory(limit = 14) {
  if (getDataMode() === 'local') {
    const { getDates, getDay } = await lib('data.js');
    const { buildDaySummary } = await lib('index-store.js');
    const dates = await getDates();
    const recent = dates.slice(-limit);
    const days = [];
    for (const d of recent) {
      const day = await getDay(d);
      if (day) days.push(buildDaySummary(day));
    }
    return { ok: true, data: { days } };
  }
  return fetchRemote(`/api/history?limit=${limit}`);
}

export async function getCompare(dateA, dateB) {
  if (getDataMode() === 'local') {
    const { getDay } = await lib('data.js');
    const { compareDays } = await lib('stats.js');
    const [dayA, dayB] = await Promise.all([getDay(dateA), getDay(dateB)]);
    if (!dayA || !dayB) {
      return { ok: false, error: 'Missing data for one or both dates', data: null };
    }
    return { ok: true, data: compareDays(dayA, dayB) };
  }
  return fetchRemote(
    `/api/compare?dateA=${encodeURIComponent(dateA)}&dateB=${encodeURIComponent(dateB)}`
  );
}

export async function getAlltime() {
  if (getDataMode() === 'local') {
    const { loadIndex } = await lib('data.js');
    const { getDates, getDay } = await lib('data.js');
    const index = await loadIndex();
    if (index?.alltime?.length) {
      return {
        ok: true,
        data: {
          members: index.alltime,
          dayCount: index.dayCount,
          updatedAt: index.updatedAt,
        },
      };
    }
    const dates = await getDates();
    const totals = {};
    for (const date of dates) {
      const day = await getDay(date);
      if (!day) continue;
      for (const m of day.members || []) {
        const key = String(m.id || m.name);
        if (!totals[key]) {
          totals[key] = {
            id: m.id,
            name: m.name,
            respect: 0,
            hits: 0,
            assists: 0,
            losses: 0,
            chainHits: 0,
            chainRespect: 0,
            activeDays: 0,
          };
        }
        const t = totals[key];
        t.respect += m.respect || 0;
        t.hits += m.hits || 0;
        t.assists += m.assists || 0;
        t.losses += m.losses || 0;
        t.chainHits += m.chainHits || 0;
        t.chainRespect += m.chainRespect || 0;
        if ((m.hits || 0) > 0) t.activeDays++;
      }
    }
    const members = Object.values(totals)
      .map((m) => ({
        ...m,
        chainAvgHit:
          m.chainHits > 0 ? +(m.chainRespect / m.chainHits).toFixed(2) : 0,
      }))
      .sort((a, b) => b.respect - a.respect);
    return { ok: true, data: { members, dayCount: dates.length } };
  }
  return fetchRemote('/api/alltime');
}

export function describeDataMode() {
  const mode = getDataMode();
  if (mode === 'local') return 'local (TORN_API_KEY + repo data/)';
  if (mode === 'remote') return `remote (${getRemoteConfig().appUrl})`;
  return 'not configured';
}
