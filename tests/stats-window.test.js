import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  resolveStatsWindow,
  parseStatsMode,
  STATS_MODE_CALENDAR,
  STATS_MODE_WAR,
} from '../lib/stats-window.js';

describe('stats window', () => {
  it('uses calendar midnight bounds by default', () => {
    const w = resolveStatsWindow(
      STATS_MODE_CALENDAR,
      {},
      new Date('2026-06-04T15:00:00Z')
    );
    assert.equal(w.mode, STATS_MODE_CALENDAR);
    assert.equal(w.calendarDate, '2026-06-04');
    assert.match(w.dayWindow, /00:00–23:59/);
  });

  it('uses war start when mode is war and configured', () => {
    const warStart = Math.floor(new Date('2026-06-04T06:00:00Z').getTime() / 1000);
    const w = resolveStatsWindow(
      STATS_MODE_WAR,
      { warStartedAt: warStart, warLabel: 'RW' },
      new Date('2026-06-04T15:00:00Z')
    );
    assert.equal(w.mode, STATS_MODE_WAR);
    assert.equal(w.fromTs, warStart);
    assert.match(w.dayWindow, /RW/);
  });

  it('falls back to calendar when war mode requested but not configured', () => {
    const w = resolveStatsWindow(
      STATS_MODE_WAR,
      {},
      new Date('2026-06-04T15:00:00Z')
    );
    assert.equal(w.mode, STATS_MODE_CALENDAR);
  });

  it('parseStatsMode respects war config', () => {
    const ts = Math.floor(new Date('2026-06-04T06:00:00Z').getTime() / 1000);
    assert.equal(parseStatsMode('war', { warStartedAt: ts }), STATS_MODE_WAR);
    assert.equal(parseStatsMode('war', {}), STATS_MODE_CALENDAR);
  });
});
