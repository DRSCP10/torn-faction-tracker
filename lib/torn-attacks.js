/** Torn faction attacks API returns at most 100 records per request (v1). */

export const ATTACKS_API_LIMIT = 100;

/**
 * Fetch all attacks in [fromTs, toTs], splitting the window when a response hits the cap.
 * @param {number} fromTs
 * @param {number} toTs
 * @param {(path: string) => Promise<{ ok: boolean, data?: object, error?: string }>} tornFetchSafe
 */
export async function fetchAllFactionAttacks(fromTs, toTs, tornFetchSafe) {
  const merged = {};
  const warnings = [];
  let apiCalls = 0;

  async function fetchRange(from, to) {
    apiCalls++;
    const result = await tornFetchSafe(
      `/faction/?selections=attacks&from=${from}&to=${to}`
    );
    if (!result.ok) {
      return { ok: false, error: result.error };
    }

    const attacks = result.data.attacks || {};
    const count = Object.keys(attacks).length;

    if (count >= ATTACKS_API_LIMIT && to - from > 60) {
      const mid = Math.floor((from + to) / 2);
      const left = await fetchRange(from, mid);
      if (!left.ok) return left;
      const right = await fetchRange(mid + 1, to);
      if (!right.ok) return right;
      return { ok: true };
    }

    Object.assign(merged, attacks);
    if (count >= ATTACKS_API_LIMIT) {
      warnings.push(
        `Attacks may be incomplete for ${from}–${to} (API returned ${ATTACKS_API_LIMIT} records)`
      );
    }
    return { ok: true };
  }

  const result = await fetchRange(fromTs, toTs);
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      attacks: merged,
      apiCalls,
      warnings,
    };
  }

  return {
    ok: true,
    attacks: merged,
    count: Object.keys(merged).length,
    apiCalls,
    warnings,
  };
}
