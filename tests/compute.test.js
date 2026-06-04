import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  memberStatsFromAttacks,
  computeChainTimes,
  buildDayMeta,
} from '../lib/compute.js';
import { underperformers, compareDays } from '../lib/stats.js';
import { tornDayBounds, getCurrentTornDate } from '../lib/torn-day.js';

describe('tornDayBounds', () => {
  it('uses noon UTC boundaries', () => {
    const { fromTs, toTs } = tornDayBounds('2026-05-29');
    assert.equal(fromTs, Math.floor(new Date('2026-05-29T12:00:00Z').getTime() / 1000));
    assert.ok(toTs > fromTs);
    assert.ok(toTs - fromTs < 90000);
  });
});

describe('memberStatsFromAttacks', () => {
  it('tracks chain hits and low respect hits', () => {
    const attacks = {
      a1: {
        attacker_id: 1,
        attacker_name: 'Alice',
        defender_name: 'Bob',
        result: 'Attacked',
        respect_gain: 0.2,
        chain: 5,
        started: 1000,
      },
      a2: {
        attacker_id: 1,
        attacker_name: 'Alice',
        defender_name: 'Carl',
        result: 'Attacked',
        respect_gain: 5,
        chain: 6,
        started: 1100,
      },
      a3: {
        attacker_id: 2,
        attacker_name: 'Dave',
        defender_name: 'Eve',
        result: 'Attacked',
        respect_gain: 4,
        chain: 7,
        started: 1200,
      },
    };
    const { members } = memberStatsFromAttacks(attacks, {
      1: { name: 'Alice' },
      2: { name: 'Dave' },
    });
    const alice = members.find((m) => m.name === 'Alice');
    assert.equal(alice.chainHits, 2);
    assert.equal(alice.lowRespectHits, 1);
    assert.equal(alice.chainRespect, 5.2);
  });

  it('returns top 5 hits by respect gain', () => {
    const attacks = {};
    for (let i = 0; i < 8; i++) {
      attacks[`a${i}`] = {
        attacker_id: 1,
        attacker_name: 'Alice',
        defender_name: `Target${i}`,
        result: 'Attacked',
        respect_gain: i + 1,
        chain: 0,
        started: 1000 + i,
      };
    }
    const { bestHits, bestHit } = memberStatsFromAttacks(attacks, {
      1: { name: 'Alice' },
    });
    assert.equal(bestHits.length, 5);
    assert.equal(bestHits[0].respect, 8);
    assert.equal(bestHits[0].target, 'Target7');
    assert.equal(bestHits[4].respect, 4);
    assert.equal(bestHit.respect, 8);
  });
});

describe('underperformers', () => {
  it('flags weak chain avg vs median', () => {
    const members = [
      { id: '1', name: 'A', hits: 20, respect: 40, chainHits: 20, chainRespect: 40, chainAvgHit: 2, avgHit: 2, lowRespectHits: 0 },
      { id: '2', name: 'B', hits: 20, respect: 20, chainHits: 20, chainRespect: 20, chainAvgHit: 1, avgHit: 1, lowRespectHits: 5 },
      { id: '3', name: 'C', hits: 20, respect: 38, chainHits: 20, chainRespect: 38, chainAvgHit: 1.9, avgHit: 1.9, lowRespectHits: 0 },
    ];
    const low = underperformers(members, { minChainHits: 5 });
    assert.ok(low.some((m) => m.name === 'B'));
  });
});

describe('compareDays', () => {
  it('computes respect deltas', () => {
    const cmp = compareDays(
      { date: '2026-05-01', meta: { totalRespect: 10 }, members: [{ id: 1, name: 'A', respect: 5, hits: 1, avgHit: 5 }] },
      { date: '2026-05-02', meta: { totalRespect: 20 }, members: [{ id: 1, name: 'A', respect: 15, hits: 3, avgHit: 5 }] }
    );
    assert.equal(cmp.respectDelta, 10);
    assert.equal(cmp.improved[0].respectDelta, 10);
  });
});

describe('computeChainTimes', () => {
  it('records milestone when chain reaches 10', () => {
    const attacks = {};
    for (let i = 1; i <= 12; i++) {
      attacks[i] = {
        result: 'Attacked',
        started: 1000 + i * 30,
        chain: i,
        attacker_name: 'X',
      };
    }
    const chains = computeChainTimes(attacks);
    assert.ok(chains.to10.length >= 1);
    assert.ok(chains.to10[0].seconds > 0);
  });
});
