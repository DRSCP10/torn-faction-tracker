import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  tornDayBounds,
  calendarDayBounds,
  getCurrentTornDate,
  getCurrentCalendarDate,
  getLastCompletedTornDate,
  getTornDayWindowLabel,
  getCalendarDayWindowLabel,
  formatTctTime,
  TCT_LABEL,
  TCT_TIMEZONE,
} from '../lib/torn-day.js';

describe('TCT torn day', () => {
  it('uses noon TCT (UTC) boundaries', () => {
    const { fromTs, toTs, fromTct, toTct } = tornDayBounds('2026-05-29');
    assert.equal(fromTs, Math.floor(new Date('2026-05-29T12:00:00Z').getTime() / 1000));
    assert.equal(toTs, Math.floor(new Date('2026-05-30T11:59:59.999Z').getTime() / 1000));
    assert.match(fromTct, /12:00:00 TCT/);
    assert.match(toTct, /2026-05-30 11:59:59 TCT/);
  });

  it('labels window as TCT', () => {
    assert.equal(getTornDayWindowLabel(), '12:00–11:59 TCT');
    assert.equal(TCT_LABEL, 'TCT');
    assert.equal(TCT_TIMEZONE, 'UTC');
  });

  it('current torn date before noon TCT is previous calendar day', () => {
    assert.equal(
      getCurrentTornDate(new Date('2026-06-04T11:30:00Z')),
      '2026-06-03'
    );
    assert.equal(
      getCurrentTornDate(new Date('2026-06-04T12:30:00Z')),
      '2026-06-04'
    );
  });

  it('last completed torn date after noon TCT', () => {
    assert.equal(
      getLastCompletedTornDate(new Date('2026-06-05T13:00:00Z')),
      '2026-06-04'
    );
  });

  it('formats clock in TCT', () => {
    const s = formatTctTime(new Date('2026-06-04T15:04:05Z'));
    assert.match(s, /15:04:05 TCT/);
  });
});

describe('TCT calendar day', () => {
  it('uses midnight TCT (UTC) boundaries', () => {
    const { fromTs, toTs, fromTct, toTct } = calendarDayBounds('2026-06-04');
    assert.equal(fromTs, Math.floor(new Date('2026-06-04T00:00:00Z').getTime() / 1000));
    assert.equal(toTs, Math.floor(new Date('2026-06-04T23:59:59.999Z').getTime() / 1000));
    assert.match(fromTct, /00:00:00 TCT/);
    assert.match(toTct, /2026-06-04 23:59:59 TCT/);
  });

  it('labels calendar window', () => {
    assert.equal(getCalendarDayWindowLabel(), '00:00–23:59 TCT');
  });

  it('current calendar date follows UTC date', () => {
    assert.equal(
      getCurrentCalendarDate(new Date('2026-06-04T11:30:00Z')),
      '2026-06-04'
    );
    assert.equal(
      getCurrentCalendarDate(new Date('2026-06-04T23:30:00Z')),
      '2026-06-04'
    );
  });
});
