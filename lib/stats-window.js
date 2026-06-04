import {
  calendarDayBounds,
  getCurrentCalendarDate,
  getCalendarDayWindowLabel,
  formatTctDateTime,
} from './torn-day.js';

export const STATS_MODE_CALENDAR = 'calendar';
export const STATS_MODE_WAR = 'war';

/** @param {number|null|undefined} warStartedAt Unix seconds */
export function warWindowBounds(warStartedAt, now = new Date()) {
  const fromTs = Math.floor(Number(warStartedAt));
  const toTs = Math.floor(now.getTime() / 1000);
  return {
    fromTs,
    toTs,
    fromTct: formatTctDateTime(new Date(fromTs * 1000)),
    toTct: formatTctDateTime(now),
  };
}

export function hoursSinceCalendarMidnightTct(now = new Date()) {
  const start = new Date(`${now.toISOString().slice(0, 10)}T00:00:00.000Z`);
  return (now.getTime() - start.getTime()) / 3_600_000;
}

export function hoursSinceUnix(fromTs, now = new Date()) {
  const from = Number(fromTs);
  if (!from) return 0;
  return (now.getTime() / 1000 - from) / 3600;
}

/**
 * @param {'calendar'|'war'} mode
 * @param {{ warStartedAt?: number|null, warLabel?: string }} warConfig
 */
export function resolveStatsWindow(mode, warConfig = {}, now = new Date()) {
  const warStartedAt = warConfig.warStartedAt
    ? Math.floor(Number(warConfig.warStartedAt))
    : null;
  const warLabel = (warConfig.warLabel || 'War').trim() || 'War';

  if (mode === STATS_MODE_WAR && warStartedAt) {
    const bounds = warWindowBounds(warStartedAt, now);
    return {
      mode: STATS_MODE_WAR,
      warStartedAt,
      warLabel,
      warActive: true,
      calendarDate: null,
      dayWindow: `Since ${warLabel} start`,
      dayBounds: { from: bounds.fromTct, to: bounds.toTct },
      fromTs: bounds.fromTs,
      toTs: bounds.toTs,
    };
  }

  const calendarDate = getCurrentCalendarDate(now);
  const dayBounds = calendarDayBounds(calendarDate);
  return {
    mode: STATS_MODE_CALENDAR,
    warStartedAt,
    warLabel,
    warActive: Boolean(warStartedAt),
    calendarDate,
    dayWindow: getCalendarDayWindowLabel(),
    dayBounds: { from: dayBounds.fromTct, to: dayBounds.toTct },
    fromTs: dayBounds.fromTs,
    toTs: dayBounds.toTs,
  };
}

export function parseStatsMode(queryMode, warConfig = {}) {
  const warStartedAt = warConfig.warStartedAt
    ? Math.floor(Number(warConfig.warStartedAt))
    : null;
  if (queryMode === STATS_MODE_WAR && warStartedAt) {
    return STATS_MODE_WAR;
  }
  return STATS_MODE_CALENDAR;
}
