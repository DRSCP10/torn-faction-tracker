import { HIT_RESULTS } from './constants.js';
import { LOW_RESPECT_HIT } from './upgrades.js';

const CHAIN_GAP_SEC = 900;
export const TOP_HITS_COUNT = 5;
/** Outgoing stealth with hidden attacker (matches Torn log). */
export const STEALTH_OUTGOING_LABEL = 'Someone (our stealth hit)';
/** Shown on members who were hit by a hidden stealth attacker. */
export const STEALTH_INCOMING_LABEL = 'Attacked by Someone (stealth)';

export function isStealthedAttack(atk) {
  return atk?.stealthed === 1 || atk?.stealthed === '1' || atk?.stealthed === true;
}

export function isFactionOutgoingAttack(atk, factionId, allMembers = {}) {
  const fid = String(factionId ?? '');
  const af = String(atk?.attacker_faction ?? '');
  if (fid && af && af === fid) return true;
  const attackerId = String(atk?.attacker_id ?? '');
  return Boolean(attackerId && allMembers[attackerId]);
}

export function isFactionIncomingAttack(atk, factionId, allMembers = {}) {
  const fid = String(factionId ?? '');
  const df = String(atk?.defender_faction ?? '');
  if (fid && df && df === fid) return true;
  const defenderId = String(atk?.defender_id ?? '');
  return Boolean(defenderId && allMembers[defenderId]);
}

/** Display name for an attacker row. */
export function resolveAttackerName(atk, rosterName = null) {
  const apiName = String(atk?.attacker_name || '').trim();
  if (apiName) return apiName;
  if (isStealthedAttack(atk)) return STEALTH_OUTGOING_LABEL;
  const roster = String(rosterName || '').trim();
  if (roster) return roster;
  return 'Unknown';
}

/**
 * Stats bucket for an attack row.
 * Incoming stealth on our members is not credited as an outgoing "Someone" hit.
 */
export function attackerStatsBucket(atk, allMembers = {}, factionId = null) {
  const apiName = String(atk?.attacker_name || '').trim();
  const rawId = atk?.attacker_id;

  if (
    isStealthedAttack(atk) &&
    !apiName &&
    isFactionIncomingAttack(atk, factionId, allMembers)
  ) {
    return {
      incomingStealth: true,
      defenderId: String(atk.defender_id),
    };
  }

  if (isStealthedAttack(atk) && !apiName) {
    const suffix =
      rawId !== undefined && rawId !== null && String(rawId) !== ''
        ? String(rawId)
        : 'hidden';
    return {
      id: `stealth:${suffix}`,
      name: STEALTH_OUTGOING_LABEL,
    };
  }

  const id = String(rawId);
  return {
    id,
    name: resolveAttackerName(atk, allMembers[id]?.name),
  };
}

export function memberStatsFromAttacks(attacks, allMembers = {}, factionId = null) {
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
      stealthAttacksOnUs: 0,
    };
  }

  const hitLog = [];
  let stealthAttacksOnUs = 0;

  for (const atk of Object.values(attacks || {})) {
    const bucket = attackerStatsBucket(atk, allMembers, factionId);

    if (bucket.incomingStealth) {
      const defenderId = bucket.defenderId;
      if (!members[defenderId]) {
        members[defenderId] = {
          id: defenderId,
          name: atk.defender_name || allMembers[defenderId]?.name || 'Unknown',
          respect: 0,
          hits: 0,
          assists: 0,
          losses: 0,
          chainHits: 0,
          chainRespect: 0,
          lowRespectHits: 0,
          bestHit: 0,
          bestHitTarget: null,
          stealthAttacksOnUs: 0,
        };
      }
      members[defenderId].stealthAttacksOnUs++;
      stealthAttacksOnUs++;
      if (HIT_RESULTS.includes(atk.result)) {
        members[defenderId].losses++;
      }
      continue;
    }

    const { id, name: displayName } = bucket;
    if (!members[id]) {
      members[id] = {
        id,
        name: displayName,
        respect: 0,
        hits: 0,
        assists: 0,
        losses: 0,
        chainHits: 0,
        chainRespect: 0,
        lowRespectHits: 0,
        bestHit: 0,
        bestHitTarget: null,
        stealthAttacksOnUs: 0,
      };
    } else if (
      members[id].name === 'Unknown' &&
      displayName !== 'Unknown'
    ) {
      members[id].name = displayName;
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
      if (gain > 0) {
        hitLog.push({
          respect: gain,
          member: members[id].name,
          target: atk.defender_name || 'unknown',
        });
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

  const bestHits = hitLog
    .sort((a, b) => b.respect - a.respect)
    .slice(0, TOP_HITS_COUNT)
    .map((h) => ({
      respect: +h.respect.toFixed(2),
      member: h.member,
      target: h.target,
    }));

  const bestHit = bestHits[0] || { respect: 0, member: null, target: null };

  return { members: memberList, bestHits, bestHit, stealthAttacksOnUs };
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

export function buildDayMeta(members, bestHitsInput) {
  const active = members.filter((m) => m.hits > 0);
  const chainActive = members.filter((m) => (m.chainHits || 0) > 0);
  const totalRespect = +members.reduce((s, m) => s + m.respect, 0).toFixed(2);
  const mostHits = [...members].sort((a, b) => b.hits - a.hits)[0];
  const mostChain = [...members].sort(
    (a, b) => (b.chainHits || 0) - (a.chainHits || 0)
  )[0];

  const bestHits = normalizeBestHits(bestHitsInput);

  return {
    totalRespect,
    bestHits: bestHits.length ? bestHits : null,
    bestHit: bestHits[0] || null,
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

function normalizeBestHits(input) {
  if (Array.isArray(input)) {
    return input.filter((h) => h && h.respect > 0).slice(0, TOP_HITS_COUNT);
  }
  if (input?.respect > 0) return [input];
  return [];
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
