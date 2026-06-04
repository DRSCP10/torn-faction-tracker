import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isKvConfigured,
  kvKeyForPath,
  isKvBackedPath,
  getKvStorageStatus,
} from '../lib/kv-store.js';
import { storageKeyForPath } from '../lib/admin-storage.js';

describe('kv-store', () => {
  it('maps admin file paths to redis keys', () => {
    assert.equal(storageKeyForPath('data/access.json'), 'access');
    assert.equal(kvKeyForPath('data/access.json'), 'faction:access');
    assert.equal(kvKeyForPath('data/settings.json'), 'faction:settings');
    assert.equal(kvKeyForPath('data/2026-01-01.json'), null);
    assert.equal(isKvBackedPath('data/access.json'), true);
    assert.equal(isKvBackedPath('data/2026-01-01.json'), false);
  });

  it('isKvConfigured when rest url and token set', () => {
    const prevUrl = process.env.UPSTASH_REDIS_REST_URL;
    const prevToken = process.env.UPSTASH_REDIS_REST_TOKEN;
    delete process.env.KV_REST_API_URL;
    delete process.env.KV_REST_API_TOKEN;
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'secret';
    assert.equal(isKvConfigured(), true);
    assert.equal(getKvStorageStatus().configured, true);
    if (prevUrl) process.env.UPSTASH_REDIS_REST_URL = prevUrl;
    else delete process.env.UPSTASH_REDIS_REST_URL;
    if (prevToken) process.env.UPSTASH_REDIS_REST_TOKEN = prevToken;
    else delete process.env.UPSTASH_REDIS_REST_TOKEN;
  });
});
