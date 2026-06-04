import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  fetchAllFactionAttacks,
  ATTACKS_API_LIMIT,
} from '../lib/torn-attacks.js';

describe('fetchAllFactionAttacks', () => {
  it('merges a single page under the API cap', async () => {
    const calls = [];
    const tornFetchSafe = async (path) => {
      calls.push(path);
      return {
        ok: true,
        data: {
          attacks: {
            a1: { started: 1, result: 'Attacked' },
            a2: { started: 2, result: 'Mugged' },
          },
        },
      };
    };

    const result = await fetchAllFactionAttacks(100, 200, tornFetchSafe);
    assert.equal(result.ok, true);
    assert.equal(result.count, 2);
    assert.equal(calls.length, 1);
    assert.equal(result.apiCalls, 1);
  });

  it('splits the window when a page hits the API cap', async () => {
    const calls = [];
    const tornFetchSafe = async (path) => {
      calls.push(path);
      const m = path.match(/from=(\d+)&to=(\d+)/);
      const from = Number(m[1]);
      const to = Number(m[2]);
      const span = to - from;
      const count = span >= 50 ? ATTACKS_API_LIMIT : 3;
      const attacks = {};
      for (let i = 0; i < count; i++) {
        attacks[`${from}-${i}`] = { started: from + i, result: 'Attacked' };
      }
      return { ok: true, data: { attacks } };
    };

    const result = await fetchAllFactionAttacks(0, 99, tornFetchSafe);
    assert.equal(result.ok, true);
    assert.equal(result.count, 6);
    assert.ok(calls.length > 1);
  });

  it('surfaces API errors from the top-level request', async () => {
    const tornFetchSafe = async () => ({ ok: false, error: 'Rate limited' });
    const result = await fetchAllFactionAttacks(0, 200, tornFetchSafe);
    assert.equal(result.ok, false);
    assert.equal(Object.keys(result.attacks).length, 0);
    assert.match(result.error, /Rate limited/);
  });
});
