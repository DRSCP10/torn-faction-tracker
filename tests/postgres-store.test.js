import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isPostgresConfigured,
  storageKeyForPath,
  getPostgresStorageStatus,
} from '../lib/postgres-store.js';

describe('postgres-store', () => {
  it('maps admin paths to storage keys', () => {
    assert.equal(storageKeyForPath('data/access.json'), 'access');
    assert.equal(storageKeyForPath('data/settings.json'), 'settings');
    assert.equal(storageKeyForPath('data/2026-01-01.json'), null);
  });

  it('isPostgresConfigured when POSTGRES_URL set', () => {
    const prev = process.env.POSTGRES_URL;
    process.env.POSTGRES_URL = 'postgres://user:pass@host/db';
    assert.equal(isPostgresConfigured(), true);
    assert.equal(getPostgresStorageStatus().table, 'faction_storage');
    if (prev) process.env.POSTGRES_URL = prev;
    else delete process.env.POSTGRES_URL;
  });
});
