import { HIT_RESULTS } from './constants.js';
import { LOW_RESPECT_HIT } from './upgrades.js';

const CHAIN_GAP_SEC = 900;

export function memberStatsFromAttacks(attacks, allMembers = {}) {
  const members = {};
  for (const [id, m] of Object.entries(allMembers)) {
    members[id] = {
      id,
      name: m.name,
      respect: 0,
      hits: 0,
      assists: 0,
      losses: 0,
      chainHits: 0,
      chainRespect: 0,
      lowRespectHits: 0,
      bestHit: 0,
      bestHitTarget: null,
    };
  }

  let bestHit = { respect: 0, member: null, target: null };

  for (const atk of Object.values(attacks || {})) {
    const id = String(atk.attacker_id);
    if (!members[id]) {
      members[id] = {
        id,
        name: atk.attacker_name || 'Unknown',
        respect: 0,
        hits: 0,
        assists: 0,
        losses: 0,
        chainHits: 0,
        chainRespect: 0,
        lowRespectHits: 0,
        bestHit: 0,
        bestHitTarget: null,
      };
    }

    if (HIT_RESULTS.includes(atk.result)) {
      members[id].hits++;
      const gain = atk.respect_gain || 0;
      members[id].respect += gain;
      if (gain < LOW_RESPECT_HIT) members[id].lowRespectHits++;
      const chainNum = atk.chain ?? 0;
      if (chainNum > 0) {
        members[id].chainHits++;
        members[id].chainRespect += gain;
      }
      if (gain > members[id].bestHit) {
        members[id].bestHit = gain;
        members[id].bestHitTarget = atk.defender_name || null;
      }
      if (gain > bestHit.respect) {
        bestHit = {
          respect: gain,
          member: members[id].name,
          target: atk.defender_name || 'unknown',
        };
      }
    } else if (atk.result === 'Assist') {
      members[id].assists++;
    } else if (['Lost', 'Stalemate', 'Interrupted'].includes(atk.result)) {
      members[id].losses++;
    }
  }

  const memberList = Object.values(members).map((m) => ({
    ...m,
    avgHit: m.hits > 0 ? +(m.respect / m.hits).toFixed(2) : 0,
    chainAvgHit:
      m.chainHits > 0 ? +(m.chainRespect / m.chainHits).toFixed(2) : 0,
    respect: +m.respect.toFixed(2),
    chainRespect: +m.chainRespect.toFixed(2),
    bestHit: +m.bestHit.toFixed(2),
  }));

  return { members: memberList, bestHit };
}

export function computeChainTimes(attacks) {
  const hits = Object.values(attacks || {})
    .filter((a) => HIT_RESULTS.includes(a.result) && a.started)
    .sort((a, b) => a.started - b.started);

  const segments = [];
  let current = [];

  for (const hit of hits) {
    const chain = hit.chain ?? 0;
    const prev = current[current.length - 1];
    const gap = prev ? hit.started - prev.started : 0;
    const chainBreak =
      current.length > 0 &&
      (chain <= 1 ||
        (prev?.chain && chain < prev.chain) ||
        gap > CHAIN_GAP_SEC);

    if (chainBreak) {
      segments.push(current);
      current = [];
    }
    current.push(hit);
  }
  if (current.length) segments.push(current);

  const milestones = [10, 25, 50];
  const result = { to10: [], to25: [], to50: [] };

  for (const seg of segments) {
    if (seg.length < 2) continue;
    const start = seg[0].started;
    const hitters = new Set(seg.map((h) => h.attacker_name).filter(Boolean));
    const maxChain = Math.max(...seg.map((h) => h.chain ?? 0));

    for (const n of milestones) {
      if (maxChain < n) continue;
      const milestoneHit =
        seg.find((h) => (h.chain ?? 0) >= n) || seg[seg.length - 1];
      const seconds = milestoneHit.started - start;
      if (seconds <= 0) continue;
      result[`to${n}`].push({
        seconds,
        hitters: [...hitters],
        finishedAt: new Date(milestoneHit.started * 1000).toISOString(),
      });
    }
  }

  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => a.seconds - b.seconds);
  }

  return result;
}

export function buildDayMeta(members, bestHit) {
  const active = members.filter((m) => m.hits > 0);
  const chainActive = members.filter((m) => (m.chainHits || 0) > 0);
  const totalRespect = +members.reduce((s, m) => s + m.respect, 0).toFixed(2);
  const mostHits = [...members].sort((a, b) => b.hits - a.hits)[0];
  const mostChain = [...members].sort(
    (a, b) => (b.chainHits || 0) - (a.chainHits || 0)
  )[0];

  return {
    totalRespect,
    bestHit: bestHit.respect > 0 ? bestHit : null,
    mostHits: mostHits?.hits > 0 ? { name: mostHits.name, hits: mostHits.hits } : null,
    mostChainHits:
      mostChain?.chainHits > 0
        ? { name: mostChain.name, hits: mostChain.chainHits }
        : null,
    activeMembers: active.length,
    chainParticipants: chainActive.length,
    avgHitFaction:
      active.length > 0
        ? +(active.reduce((s, m) => s + m.avgHit, 0) / active.length).toFixed(2)
        : 0,
    medianChainAvg:
      chainActive.length > 0
        ? +median(
            chainActive.map((m) =>
              m.chainHits > 0 ? m.chainRespect / m.chainHits : 0
            )
          ).toFixed(2)
        : 0,
  };
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function rankProgress(factionRespect) {
  const thresholds = [
    { name: 'Unranked', respect: 0 },
    { name: 'Bronze', respect: 1000 },
    { name: 'Silver', respect: 5000 },
    { name: 'Gold', respect: 20000 },
    { name: 'Platinum', respect: 50000 },
    { name: 'Diamond', respect: 100000 },
    { name: 'Master', respect: 250000 },
  ];

  let current = thresholds[0];
  let next = thresholds[1];

  for (let i = 0; i < thresholds.length; i++) {
    if (factionRespect >= thresholds[i].respect) {
      current = thresholds[i];
      next = thresholds[i + 1] || null;
    }
  }

  if (!next) {
    return {
      currentRank: current.name,
      nextRank: null,
      currentRespect: factionRespect,
      nextThreshold: null,
      progress: 100,
      remaining: 0,
    };
  }

  const span = next.respect - current.respect;
  const into = factionRespect - current.respect;
  const progress = Math.min(100, Math.max(0, (into / span) * 100));

  return {
    currentRank: current.name,
    nextRank: next.name,
    currentRespect: factionRespect,
    nextThreshold: next.respect,
    progress: +progress.toFixed(1),
    remaining: Math.max(0, next.respect - factionRespect),
  };
}
