import { rankProgress } from './compute.js';

const LOW_RESPECT_HIT = 0.5;

/**
 * Parse faction upgrades + basic for available respect and next purchasable upgrade.
 */
export function parseUpgradeProgress(basic, upgradesRaw) {
  const totalRespect = basic?.respect ?? 0;
  let available =
    upgradesRaw?.respect ??
    upgradesRaw?.available_respect ??
    upgradesRaw?.respect_available ??
    basic?.respect_available ??
    null;

  const candidates = [];

  function consider(item) {
    if (!item || typeof item !== 'object') return;
    const name = item.name || item.title || item.label;
    const cost = Number(item.cost ?? item.respect ?? item.price ?? 0);
    const unlocked = item.unlocked ?? item.purchased ?? item.owned;
    const canBuy = item.can_buy ?? item.available ?? item.buyable;
    if (!name || cost <= 0) return;
    if (unlocked === true) return;
    if (canBuy === false) return;
    candidates.push({ name: String(name), cost });
  }

  function walk(node) {
    if (!node || typeof node !== 'object') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    consider(node);
    for (const v of Object.values(node)) {
      if (v && typeof v === 'object') walk(v);
    }
  }

  walk(upgradesRaw);

  if (typeof upgradesRaw === 'object' && upgradesRaw !== null) {
    for (const [key, val] of Object.entries(upgradesRaw)) {
      if (key === 'respect' && typeof val === 'number') available = val;
    }
  }

  candidates.sort((a, b) => a.cost - b.cost);
  const next = candidates.find((c) => c.cost > 0) || null;

  if (next && available != null) {
    const pool = Number(available);
    const progress = Math.min(100, Math.max(0, (pool / next.cost) * 100));
    return {
      type: 'upgrade',
      availableRespect: pool,
      totalRespect,
      nextName: next.name,
      nextCost: next.cost,
      progress: +progress.toFixed(1),
      remaining: Math.max(0, next.cost - pool),
      currentRank: basic?.rank?.name ?? '—',
    };
  }

  const rank = rankProgress(totalRespect);
  return {
    type: 'rank',
    availableRespect: null,
    totalRespect,
    nextName: rank.nextRank,
    nextCost: rank.nextThreshold,
    progress: rank.progress,
    remaining: rank.remaining,
    currentRank: rank.currentRank,
  };
}

export { LOW_RESPECT_HIT };
