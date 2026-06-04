import fs from 'fs';
import path from 'path';
import { isDataFile } from './torn-day.js';

const DATA_DIR = path.join(process.cwd(), 'data');

export function buildDaySummary(day) {
  const members = day.members || [];
  return {
    date: day.date,
    totalRespect:
      day.meta?.totalRespect ??
      +members.reduce((s, m) => s + (m.respect || 0), 0).toFixed(2),
    totalHits: members.reduce((s, m) => s + (m.hits || 0), 0),
    totalAssists: members.reduce((s, m) => s + (m.assists || 0), 0),
    totalLosses: members.reduce((s, m) => s + (m.losses || 0), 0),
    activeMembers: day.meta?.activeMembers ?? members.filter((m) => m.hits > 0).length,
    meta: day.meta ?? null,
    fastestChain: {
      to10: day.chains?.to10?.[0]?.seconds ?? null,
      to25: day.chains?.to25?.[0]?.seconds ?? null,
      to50: day.chains?.to50?.[0]?.seconds ?? null,
    },
  };
}

export function mergeAlltime(alltime, members) {
  for (const m of members) {
    const key = String(m.id || m.name);
    if (!alltime[key]) {
      alltime[key] = {
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
    const t = alltime[key];
    t.respect += m.respect || 0;
    t.hits += m.hits || 0;
    t.assists += m.assists || 0;
    t.losses += m.losses || 0;
    t.chainHits += m.chainHits || 0;
    t.chainRespect += m.chainRespect || 0;
    if ((m.hits || 0) > 0 || (m.respect || 0) > 0) t.activeDays++;
  }
}

export function rebuildIndex(dir = DATA_DIR) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const files = fs.readdirSync(dir).filter(isDataFile);
  const dates = files
    .map((f) => f.replace('.json', ''))
    .sort();

  const days = {};
  const alltime = {};

  for (const date of dates) {
    const raw = fs.readFileSync(path.join(dir, `${date}.json`), 'utf8');
    const day = JSON.parse(raw);
    day.date = day.date || date;
    days[date] = buildDaySummary(day);
    mergeAlltime(alltime, day.members || []);
  }

  const alltimeList = Object.values(alltime)
    .map((m) => ({
      ...m,
      respect: +m.respect.toFixed(2),
      chainRespect: +m.chainRespect.toFixed(2),
      avgHit: m.hits > 0 ? +(m.respect / m.hits).toFixed(2) : 0,
      chainAvgHit:
        m.chainHits > 0 ? +(m.chainRespect / m.chainHits).toFixed(2) : 0,
    }))
    .sort((a, b) => b.respect - a.respect);

  const index = {
    updatedAt: new Date().toISOString(),
    tornDayNote: 'Days run 12:00–11:59 TCT (Torn City Time, UTC/GMT)',
    dates,
    days,
    alltime: alltimeList,
    dayCount: dates.length,
  };

  fs.writeFileSync(
    path.join(dir, 'index.json'),
    JSON.stringify(index, null, 2)
  );
  return index;
}

export async function loadIndex() {
  const local = path.join(DATA_DIR, 'index.json');
  if (fs.existsSync(local)) {
    return JSON.parse(fs.readFileSync(local, 'utf8'));
  }

  const owner = process.env.GITHUB_OWNER || 'bnc2022mf';
  const repo = process.env.GITHUB_REPO || 'torn-faction-tracker';
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/data/index.json`
  );
  if (res.ok) return res.json();
  return null;
}
