import { HIT_RESULTS } from './constants.js';
import {
  attackerStatsBucket,
  isFactionIncomingAttack,
  isFactionOutgoingAttack,
  isStealthedAttack,
  resolveAttackerName,
  STEALTH_INCOMING_LABEL,
} from './compute.js';
import { formatTctDateTime } from './torn-day.js';

export function formatAttackTimeTct(atk) {
  const ts = atk?.timestamp_started ?? atk?.started ?? 0;
  if (!ts) return '—';
  return formatTctDateTime(new Date(ts * 1000));
}

export function attackUnixTime(atk) {
  return atk?.timestamp_started ?? atk?.started ?? 0;
}

export function attackDirection(atk, factionId, allMembers = {}) {
  const incoming = isFactionIncomingAttack(atk, factionId, allMembers);
  const outgoing = isFactionOutgoingAttack(atk, factionId, allMembers);
  if (
    incoming &&
    isStealthedAttack(atk) &&
    !String(atk?.attacker_name || '').trim()
  ) {
    return 'Attacked us (stealth)';
  }
  if (incoming) return 'Attacked us';
  if (outgoing) return 'Our attack';
  return 'Other';
}

export function reportAttackerLabel(atk, allMembers = {}, factionId = null) {
  if (
    isStealthedAttack(atk) &&
    !String(atk?.attacker_name || '').trim() &&
    isFactionIncomingAttack(atk, factionId, allMembers)
  ) {
    return 'Someone';
  }
  const bucket = attackerStatsBucket(atk, allMembers, factionId);
  if (bucket.incomingStealth) return 'Someone';
  if (bucket.name) return bucket.name;
  return resolveAttackerName(atk, allMembers[String(atk?.attacker_id)]?.name);
}

export function reportDefenderLabel(atk, allMembers = {}) {
  const id = String(atk?.defender_id ?? '');
  return (
    String(atk?.defender_name || '').trim() ||
    allMembers[id]?.name ||
    (id ? `Player ${id}` : '—')
  );
}

export function buildHitsReportRows(attacks, allMembers = {}, factionId = null) {
  const rows = [];
  for (const [attackId, atk] of Object.entries(attacks || {})) {
    const direction = attackDirection(atk, factionId, allMembers);
    const result = atk?.result || 'Unknown';
    rows.push({
      attackId,
      time: attackUnixTime(atk),
      timeTct: formatAttackTimeTct(atk),
      direction,
      attacker: reportAttackerLabel(atk, allMembers, factionId),
      attackerId: atk?.attacker_id ?? null,
      defender: reportDefenderLabel(atk, allMembers),
      defenderId: atk?.defender_id ?? null,
      result,
      respectGain: +(atk?.respect_gain ?? 0).toFixed(2),
      respectLoss: +(atk?.respect_loss ?? 0).toFixed(2),
      stealthed: isStealthedAttack(atk),
      chain: atk?.chain ?? 0,
      countsAsOffensiveHit:
        HIT_RESULTS.includes(result) &&
        isFactionOutgoingAttack(atk, factionId, allMembers),
      incomingStealth:
        direction === 'Attacked us (stealth)' ||
        (isStealthedAttack(atk) &&
          isFactionIncomingAttack(atk, factionId, allMembers) &&
          !String(atk?.attacker_name || '').trim()),
    });
  }
  return rows.sort((a, b) => b.time - a.time);
}

export function summarizeHitsReport(rows) {
  const byResult = {};
  for (const row of rows) {
    byResult[row.result] = (byResult[row.result] || 0) + 1;
  }
  return {
    total: rows.length,
    offensiveHits: rows.filter((r) => r.countsAsOffensiveHit).length,
    attackedUs: rows.filter((r) => r.direction.startsWith('Attacked us')).length,
    stealthed: rows.filter((r) => r.stealthed).length,
    byResult,
  };
}
