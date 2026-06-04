import { getTornDayWindowLabel } from './torn-day.js';

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[mid]
    : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function topByRespect(members, limit = 10) {
  return [...members]
    .filter((m) => m.respect > 0)
    .sort((a, b) => b.respect - a.respect)
    .slice(0, limit)
    .map((m) => ({
      name: m.name,
      id: m.id,
      respect: m.respect,
      hits: m.hits,
      chainHits: m.chainHits || 0,
      avgHit: m.avgHit ?? (m.hits > 0 ? +(m.respect / m.hits).toFixed(2) : 0),
      chainAvgHit: m.chainAvgHit ?? 0,
    }));
}

export function topChainTimes(chains, milestone, limit = 3) {
  const key = `to${milestone}`;
  const list = chains?.[key] || [];
  return list.slice(0, limit).map((c, i) => ({
    rank: i + 1,
    seconds: c.seconds,
    formatted: formatDuration(c.seconds),
    hitters: c.hitters || [],
  }));
}

/**
 * Flags members weak on chains: below median chain avg and/or many low-respect hits.
 */
export function underperformers(members, options = {}) {
  const minChainHits = options.minChainHits ?? 5;
  const ratioThreshold = options.ratioThreshold ?? 0.5;
  const lowHitThreshold = options.lowHitThreshold ?? 3;

  const pool = members.filter((m) => (m.chainHits || 0) >= minChainHits);
  if (pool.length < 2) {
    return legacyUnderperformers(members, options);
  }

  const avgs = pool.map((m) =>
    m.chainHits > 0 ? m.chainRespect / m.chainHits : 0
  );
  const med = median(avgs);

  return pool
    .map((m) => {
      const avgHit =
        m.chainHits > 0 ? +(m.chainRespect / m.chainHits).toFixed(2) : 0;
      const ratio = med > 0 ? +(avgHit / med).toFixed(2) : 0;
      const weakAvg = ratio < ratioThreshold;
      const manyLow = (m.lowRespectHits || 0) >= lowHitThreshold;
      return {
        name: m.name,
        id: m.id,
        hits: m.hits,
        chainHits: m.chainHits,
        respect: m.respect,
        chainRespect: m.chainRespect,
        avgHit,
        medianAvg: +med.toFixed(2),
        ratio,
        lowRespectHits: m.lowRespectHits || 0,
        reason: manyLow && weakAvg
          ? 'low avg + pity hits'
          : manyLow
            ? 'many low-respect hits'
            : 'below median chain avg',
        flagged: weakAvg || manyLow,
      };
    })
    .filter((m) => m.flagged)
    .sort((a, b) => a.ratio - b.ratio);
}

function legacyUnderperformers(members, options = {}) {
  const minHits = options.minHits ?? 8;
  const ratioThreshold = options.ratioThreshold ?? 0.5;
  const active = members.filter((m) => m.hits >= minHits);
  if (active.length === 0) return [];

  const factionAvg =
    active.reduce((s, m) => s + (m.avgHit ?? m.respect / m.hits), 0) /
    active.length;

  return active
    .map((m) => {
      const avgHit = m.avgHit ?? (m.hits > 0 ? m.respect / m.hits : 0);
      return {
        name: m.name,
        id: m.id,
        hits: m.hits,
        chainHits: m.chainHits || 0,
        respect: m.respect,
        chainRespect: m.chainRespect || 0,
        avgHit: +avgHit.toFixed(2),
        medianAvg: +factionAvg.toFixed(2),
        ratio: factionAvg > 0 ? +(avgHit / factionAvg).toFixed(2) : 0,
        lowRespectHits: m.lowRespectHits || 0,
        reason: 'below faction avg (no chain data)',
        flagged: true,
      };
    })
    .filter((m) => m.ratio < ratioThreshold)
    .sort((a, b) => a.ratio - b.ratio);
}

export function compareDays(dayA, dayB) {
  const mapB = new Map((dayB.members || []).map((m) => [String(m.id || m.name), m]));
  const deltas = [];

  for (const m of dayA.members || []) {
    const key = String(m.id || m.name);
    const b = mapB.get(key);
    if (!b) continue;
    deltas.push({
      id: m.id,
      name: m.name,
      respectA: m.respect || 0,
      respectB: b.respect || 0,
      respectDelta: +((b.respect || 0) - (m.respect || 0)).toFixed(2),
      hitsA: m.hits || 0,
      hitsB: b.hits || 0,
      hitsDelta: (b.hits || 0) - (m.hits || 0),
      avgA: m.avgHit ?? 0,
      avgB: b.avgHit ?? 0,
    });
  }

  deltas.sort((a, b) => b.respectDelta - a.respectDelta);
  return {
    dateA: dayA.date,
    dateB: dayB.date,
    totalRespectA: dayA.meta?.totalRespect ?? 0,
    totalRespectB: dayB.meta?.totalRespect ?? 0,
    respectDelta: +(
      (dayB.meta?.totalRespect ?? 0) - (dayA.meta?.totalRespect ?? 0)
    ).toFixed(2),
    improved: deltas.filter((d) => d.respectDelta > 0).slice(0, 10),
    declined: deltas
      .filter((d) => d.respectDelta < 0)
      .sort((a, b) => a.respectDelta - b.respectDelta)
      .slice(0, 10),
    all: deltas,
  };
}

export function formatDuration(seconds) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
}

export function formatSummaryText(day) {
  const meta = day.meta || {};
  const lines = [
    `📊 **Respect report — ${day.date}** (Torn day, ${getTornDayWindowLabel()})`,
    '',
  ];

  lines.push(`**Total respect:** ${meta.totalRespect ?? 0}`);

  const topHits = meta.bestHits?.length
    ? meta.bestHits
    : meta.bestHit
      ? [meta.bestHit]
      : [];
  if (topHits.length) {
    lines.push('**Top hits:**');
    topHits.forEach((h, i) => {
      lines.push(
        `${i + 1}. ${h.respect.toFixed(2)}r — ${h.target} (${h.member})`
      );
    });
  }
  if (meta.mostHits) {
    lines.push(`**Most hits:** ${meta.mostHits.name} — ${meta.mostHits.hits}`);
  }
  if (meta.mostChainHits) {
    lines.push(
      `**Most chain hits:** ${meta.mostChainHits.name} — ${meta.mostChainHits.hits}`
    );
  }

  lines.push('', '**Top 10 respect** (hits · avg/r · chain avg)');
  const top = topByRespect(day.members || [], 10);
  top.forEach((m, i) => {
    const chain =
      m.chainHits > 0 ? ` · chain ${m.chainAvgHit}` : '';
    lines.push(
      `${i + 1}. **${m.name}** — ${m.respect.toFixed(2)}r · ${m.hits} hits · ${m.avgHit} avg${chain}`
    );
  });

  const chains = day.chains || {};
  for (const n of [10, 25, 50]) {
    const fastest = topChainTimes(chains, n, 3);
    if (fastest.length === 0) continue;
    lines.push('', `**Fastest chains to ${n}**`);
    fastest.forEach((c) => {
      const who = c.hitters.length ? c.hitters.slice(0, 4).join(', ') : '—';
      lines.push(`${c.rank}. ${c.formatted} — ${who}`);
    });
  }

  const low = underperformers(day.members || []);
  if (low.length) {
    lines.push('', '**Chain underperformers**');
    low.slice(0, 5).forEach((m) => {
      lines.push(
        `• ${m.name}: ${m.avgHit} chain avg (${m.chainHits} chain hits, ${m.lowRespectHits} low-r hits) — ${m.reason}`
      );
    });
  }

  return lines.join('\n');
}
