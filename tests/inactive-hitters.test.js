import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { listMembersWithoutHits } from '../lib/inactive-hitters.js';
import { STATS_MODE_WAR } from '../lib/stats-window.js';

describe('inactive hitters', () => {
  it('lists roster members with zero hits after threshold', () => {
    const roster = { 1: { name: 'Alice' }, 2: { name: 'Bob' }, 3: { name: 'Carl' } };
    const stats = [
      { id: '1', name: 'Alice', hits: 5 },
      { id: '2', name: 'Bob', hits: 0 },
      { id: '3', name: 'Carl', hits: 0 },
    ];
    const result = listMembersWithoutHits(roster, stats, {
      mode: 'calendar',
      inactiveAfterHours: 2,
      now: new Date('2026-06-04T08:00:00Z'),
    });
    assert.equal(result.eligible, true);
    assert.deepEqual(result.members.map((m) => m.name).sort(), ['Bob', 'Carl']);
  });

  it('waits until inactiveAfterHours elapsed', () => {
    const roster = { 1: { name: 'Alice' } };
    const result = listMembersWithoutHits(roster, [], {
      mode: 'calendar',
      inactiveAfterHours: 4,
      now: new Date('2026-06-04T02:00:00Z'),
    });
    assert.equal(result.eligible, false);
    assert.equal(result.members.length, 0);
  });

  it('uses war elapsed time in war mode', () => {
    const warStart = Math.floor(new Date('2026-06-04T06:00:00Z').getTime() / 1000);
    const roster = { 1: { name: 'Alice' }, 2: { name: 'Bob' } };
    const stats = [{ id: '1', name: 'Alice', hits: 1 }];
    const result = listMembersWithoutHits(roster, stats, {
      mode: STATS_MODE_WAR,
      warStartedAt: warStart,
      inactiveAfterHours: 1,
      now: new Date('2026-06-04T08:00:00Z'),
    });
    assert.equal(result.eligible, true);
    assert.equal(result.members[0].name, 'Bob');
  });
});
