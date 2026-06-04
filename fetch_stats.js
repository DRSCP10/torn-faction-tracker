import fs from 'fs';
import {
  memberStatsFromAttacks,
  computeChainTimes,
  buildDayMeta,
} from './lib/compute.js';
import {
  tornDayBounds,
  getLastCompletedTornDate,
  getCurrentTornDate,
} from './lib/torn-day.js';
import { rebuildIndex } from './lib/index-store.js';
import { formatSummaryText } from './lib/stats.js';
import { getTornApiKey, loadSettings } from './lib/settings.js';
const BASE = 'https://api.torn.com';
const BACKFILL_FROM = process.env.BACKFILL_FROM || null;

async function fetchJSON(url) {
  const res = await fetch(url);
  return res.json();
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function notifyDiscord(day) {
  const settings = await loadSettings();
  const url =
    process.env.DISCORD_WEBHOOK_URL || settings.public?.discordWebhookUrl;
  if (!url) return;
  const text = formatSummaryText(day).slice(0, 1900);
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: text }),
  });
  console.log('Posted summary to Discord webhook');
}

async function fetchDay(date, allMembers, factionRespect, apiKey) {
  const { fromTs, toTs } = tornDayBounds(date);
  const attacks = await fetchJSON(
    `${BASE}/faction/?selections=attacks&from=${fromTs}&to=${toTs}&key=${apiKey}`
  );

  if (attacks.error) {
    console.error(`API error for ${date}:`, attacks.error.error);
    return null;
  }

  const { members, bestHits } = memberStatsFromAttacks(
    attacks.attacks,
    allMembers
  );
  const chains = computeChainTimes(attacks.attacks);
  const meta = buildDayMeta(members, bestHits);

  return {
    date,
    tornDay: { fromTs, toTs },
    factionRespect: factionRespect ?? null,
    members,
    meta,
    chains,
  };
}

async function saveDay(snapshot) {
  fs.writeFileSync(
    `data/${snapshot.date}.json`,
    JSON.stringify(snapshot, null, 2)
  );
  console.log(`Saved data/${snapshot.date}.json`);
}

async function run() {
  const API_KEY = await getTornApiKey();
  if (!API_KEY) {
    console.error('No TORN_API_KEY: set env var or save in Admin → Secrets');
    process.exit(1);
  }

  const basic = await fetchJSON(
    `${BASE}/faction/?selections=basic&key=${API_KEY}`
  );
  if (basic.error) {
    console.error('API error:', basic.error.error);
    process.exit(1);
  }

  const allMembers = basic.members || {};
  const factionRespect = basic.respect || 0;
  fs.mkdirSync('data', { recursive: true });

  if (BACKFILL_FROM) {
    console.log(`Backfilling from ${BACKFILL_FROM} (Torn days, 12:00 UTC)...`);
    const start = new Date(BACKFILL_FROM);
    const end = new Date(getLastCompletedTornDate());

    let current = new Date(start);
    while (current <= end) {
      const dateStr = current.toISOString().slice(0, 10);
      console.log(`Fetching Torn day ${dateStr}...`);
      const snapshot = await fetchDay(dateStr, allMembers, factionRespect, API_KEY);
      if (snapshot) await saveDay(snapshot);
      await sleep(1000);
      current.setUTCDate(current.getUTCDate() + 1);
    }
    console.log('Backfill complete!');
  } else {
    const dateStr = getLastCompletedTornDate();
    console.log(`Fetching completed Torn day: ${dateStr}`);
    const snapshot = await fetchDay(dateStr, allMembers, factionRespect, API_KEY);
    if (snapshot) {
      await saveDay(snapshot);
      await notifyDiscord(snapshot);
    }

    const liveDate = getCurrentTornDate();
    if (liveDate !== dateStr) {
      console.log(`Also refreshing in-progress Torn day: ${liveDate}`);
      const live = await fetchDay(liveDate, allMembers, factionRespect, API_KEY);
      if (live) await saveDay(live);
    }
  }

  rebuildIndex();
  console.log('Rebuilt data/index.json');
}

run();
