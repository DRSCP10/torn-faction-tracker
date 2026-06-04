/**
 * Torn City Time (TCT) — fixed GMT/UTC (no daylight saving).
 * Torn calendar day: 12:00 TCT → 11:59:59 TCT next calendar date.
 * @see https://www.torn.com/wiki/Time
 */

export const TCT_LABEL = 'TCT';
/** IANA zone for formatting; TCT always matches UTC. */
export const TCT_TIMEZONE = 'UTC';

export function getTornDayWindowLabel() {
  return `12:00–11:59 ${TCT_LABEL}`;
}

export function formatTctDateTime(date = new Date()) {
  const formatted = date.toLocaleString('en-GB', {
    timeZone: TCT_TIMEZONE,
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${formatted} ${TCT_LABEL}`;
}

export function formatTctTime(date = new Date()) {
  const formatted = date.toLocaleTimeString('en-GB', {
    timeZone: TCT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  return `${formatted} ${TCT_LABEL}`;
}

/** Unix bounds for API fetches (12:00 TCT on dateStr through next day 11:59:59 TCT). */
export function tornDayBounds(dateStr) {
  const fromDate = new Date(`${dateStr}T12:00:00.000Z`);
  const toDate = new Date(fromDate);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  toDate.setUTCHours(11, 59, 59, 999);
  return {
    fromTs: Math.floor(fromDate.getTime() / 1000),
    toTs: Math.floor(toDate.getTime() / 1000),
    fromTct: `${dateStr} 12:00:00 ${TCT_LABEL}`,
    toTct: `${addCalendarDays(dateStr, 1)} 11:59:59 ${TCT_LABEL}`,
  };
}

/** Current Torn date label (rolls at 12:00 TCT). */
export function getCurrentTornDate(now = new Date()) {
  const d = new Date(now);
  if (d.getUTCHours() < 12) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Last fully completed Torn day (for daily cron after 12:00 TCT). */
export function getLastCompletedTornDate(now = new Date()) {
  const d = new Date(now);
  if (d.getUTCHours() >= 12) {
    d.setUTCDate(d.getUTCDate() - 1);
  } else {
    d.setUTCDate(d.getUTCDate() - 2);
  }
  return d.toISOString().slice(0, 10);
}

/** Ms until next 12:00 TCT (next Torn day roll). */
export function msUntilNextTornDayRoll(now = new Date()) {
  const d = new Date(now);
  const next = new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0)
  );
  if (d.getTime() >= next.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next.getTime() - d.getTime();
}

function addCalendarDays(dateStr, days) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  return dt.toISOString().slice(0, 10);
}

export function isDataFile(name) {
  return (
    /^\d{4}-\d{2}-\d{2}\.json$/.test(name) ||
    (name.endsWith('.json') &&
      name !== 'index.json' &&
      name !== 'access.json' &&
      /^\d{4}-\d{2}-\d{2}/.test(name))
  );
}
