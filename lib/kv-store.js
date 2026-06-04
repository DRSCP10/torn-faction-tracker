/** Optional Upstash Redis / Vercel KV for access + settings (fallback). */

import { ADMIN_STORAGE_KEYS, storageKeyForPath, isAdminBackedPath } from './admin-storage.js';

const KV_PREFIX = 'faction:';

export function isKvConfigured() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
  return Boolean(url && token);
}

export function kvKeyForPath(filePath) {
  const key = storageKeyForPath(filePath);
  return key ? `${KV_PREFIX}${key}` : null;
}

export function isKvBackedPath(filePath) {
  return isAdminBackedPath(filePath);
}

function restConfig() {
  return {
    base: (
      process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
    ).replace(/\/$/, ''),
    token:
      process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN,
  };
}

async function redisCommand(command) {
  const { base, token } = restConfig();
  const res = await fetch(base, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || 'KV request failed');
  }
  if (data.error) throw new Error(data.error);
  return data.result;
}

export async function kvGetJson(key) {
  const raw = await redisCommand(['GET', key]);
  if (raw == null || raw === '') return null;
  try {
    return JSON.parse(raw);
  } catch {
    throw new Error(`Invalid JSON in KV key ${key}`);
  }
}

export async function kvSetJson(key, value) {
  await redisCommand(['SET', key, JSON.stringify(value)]);
}

export function getKvStorageStatus() {
  return {
    configured: isKvConfigured(),
    keys: Object.keys(ADMIN_STORAGE_KEYS).map((p) => kvKeyForPath(p)),
  };
}
