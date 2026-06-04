/**
 * Torn calendar day: noon UTC to 11:59:59 UTC next calendar day.
 * @see https://www.torn.com/wiki/Time
 */

export function tornDayBounds(dateStr) {
  const fromDate = new Date(`${dateStr}T12:00:00.000Z`);
  const toDate = new Date(fromDate);
  toDate.setUTCDate(toDate.getUTCDate() + 1);
  toDate.setUTCHours(11, 59, 59, 999);
  return {
    fromTs: Math.floor(fromDate.getTime() / 1000),
    toTs: Math.floor(toDate.getTime() / 1000),
  };
}

/** Current Torn date label (changes at 12:00 UTC). */
export function getCurrentTornDate(now = new Date()) {
  const d = new Date(now);
  if (d.getUTCHours() < 12) d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Last fully completed Torn day (for daily cron after 12:00 UTC). */
export function getLastCompletedTornDate(now = new Date()) {
  const d = new Date(now);
  if (d.getUTCHours() >= 12) {
    d.setUTCDate(d.getUTCDate() - 1);
  } else {
    d.setUTCDate(d.getUTCDate() - 2);
  }
  return d.toISOString().slice(0, 10);
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
