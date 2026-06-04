/**
 * Verify "Hits Today" against Torn faction attacks API.
 * Usage: npm run verify:hits   (reads TORN_API_KEY from .env)
 */
import { readFileSync } from 'fs';
import { HIT_RESULTS } from '../lib/constants.js';
import {
  calendarDayBounds,
  getCurrentCalendarDate,
  formatTctDateTime,
} from '../lib/torn-day.js';
import { memberStatsFromAttacks } from '../lib/compute.js';
import { fetchAllFactionAttacks } from '../lib/torn-attacks.js';

function loadEnvKey(name) {
  for (const line of readFileSync('.env', 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    if (t.startsWith(`${name}=`)) return t.slice(name.length + 1).trim();
  }
  return process.env[name] || '';
}

async function tornFetchSafe(path, key) {
  const BASE = 'https://api.torn.com';
  const res = await fetch(`${BASE}${path}${path.includes('?') ? '&' : '?'}key=${key}`);
  const data = await res.json();
  if (data?.error) {
    return { ok: false, error: data.error.error || String(data.error), data: null };
  }
  return { ok: true, data, error: null };
}

const key = loadEnvKey('TORN_API_KEY');
if (!key) {
  console.error('Set TORN_API_KEY in .env (save the file) or export it in your shell.');
  process.exit(1);
}

const calendarDate = getCurrentCalendarDate();
const { fromTs, toTs, fromTct, toTct } = calendarDayBounds(calendarDate);
const BASE = 'https://api.torn.com';

const basic = await (
  await fetch(`${BASE}/faction/?selections=basic&key=${key}`)
).json();
if (basic.error) {
  console.error('Basic API error:', basic.error);
  process.exit(1);
}

const attacksResult = await fetchAllFactionAttacks(fromTs, toTs, (path) =>
  tornFetchSafe(path, key)
);
if (!attacksResult.ok) {
  console.error('Attacks API error:', attacksResult.error);
  process.exit(1);
}

const attacks = attacksResult.attacks || {};
const attackList = Object.values(attacks);
const byResult = {};
for (const a of attackList) {
  byResult[a.result] = (byResult[a.result] || 0) + 1;
}

const { members, stealthAttacksOnUs } = memberStatsFromAttacks(
  attacks,
  basic.members,
  basic.ID
);
const totalHits = members.reduce((s, m) => s + m.hits, 0);
const hitResultsOnly = attackList.filter((a) => HIT_RESULTS.includes(a.result)).length;

console.log('--- Hits verification (same logic as dashboard) ---');
console.log('Verified at:', formatTctDateTime());
console.log('Faction:', basic.name);
console.log('Calendar date (TCT):', calendarDate);
console.log('Window:', fromTct, '→', toTct);
console.log('Unix from/to:', fromTs, toTs);
console.log('API calls:', attacksResult.apiCalls);
if (attacksResult.warnings?.length) {
  console.log('Warnings:', attacksResult.warnings);
}
console.log('');
console.log('Raw attack records from API:', attackList.length);
console.log('Hits (HIT_RESULTS types):', hitResultsOnly);
console.log('Dashboard total hits (sum of members):', totalHits);
console.log('Stealth attacks on us:', stealthAttacksOnUs);
console.log('');
console.log('Result breakdown:', byResult);
console.log('');
console.log('Top hitters:');
for (const m of [...members].filter((x) => x.hits > 0).sort((a, b) => b.hits - a.hits).slice(0, 12)) {
  console.log(`  ${m.name}: ${m.hits} hits, ${m.respect} respect`);
}
