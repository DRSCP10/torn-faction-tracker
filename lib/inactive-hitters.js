import {
  STATS_MODE_WAR,
  hoursSinceCalendarMidnightTct,
  hoursSinceUnix,
} from './stats-window.js';

/**
 * Roster members with zero offensive hits in the current stats window.
 */
export function listMembersWithoutHits(
  allMembers = {},
  statsMembers = [],
  { mode, warStartedAt, inactiveAfterHours = 2, now = new Date() } = {}
) {
  const roster = Object.entries(allMembers).map(([id, m]) => ({
    id: String(id),
    name: m.name,
  }));

  const hitters = new Set(
    statsMembers
      .filter((m) => m.hits > 0 && !String(m.id).startsWith('stealth:'))
      .map((m) => String(m.id))
  );

  const elapsedHours =
    mode === STATS_MODE_WAR && warStartedAt
      ? hoursSinceUnix(warStartedAt, now)
      : hoursSinceCalendarMidnightTct(now);

  if (elapsedHours < inactiveAfterHours) {
    return {
      eligible: false,
      elapsedHours: +elapsedHours.toFixed(1),
      inactiveAfterHours,
      members: [],
    };
  }

  const members = roster
    .filter((m) => !hitters.has(m.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return {
    eligible: true,
    elapsedHours: +elapsedHours.toFixed(1),
    inactiveAfterHours,
    members,
  };
}
