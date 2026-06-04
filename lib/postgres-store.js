import { neon } from '@neondatabase/serverless';
import {
  storageKeyForPath,
  isAdminBackedPath,
  ADMIN_STORAGE_KEYS,
} from './admin-storage.js';

export { storageKeyForPath, isAdminBackedPath } from './admin-storage.js';

export function isPostgresConfigured() {
  return Boolean(process.env.POSTGRES_URL);
}

let sql = null;
let schemaReady = false;

function getSql() {
  if (!sql) {
    if (!process.env.POSTGRES_URL) {
      throw new Error('POSTGRES_URL not configured');
    }
    sql = neon(process.env.POSTGRES_URL);
  }
  return sql;
}

export async function ensurePostgresSchema() {
  if (schemaReady || !isPostgresConfigured()) return;
  const query = getSql();
  await query`
    CREATE TABLE IF NOT EXISTS faction_storage (
      key TEXT PRIMARY KEY,
      value JSONB NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `;
  schemaReady = true;
}

export async function pgGetJson(storageKey) {
  if (!storageKey) return null;
  await ensurePostgresSchema();
  const query = getSql();
  const rows = await query`
    SELECT value FROM faction_storage WHERE key = ${storageKey}
  `;
  if (!rows.length) return null;
  const value = rows[0].value;
  return typeof value === 'string' ? JSON.parse(value) : value;
}

export async function pgSetJson(storageKey, value) {
  if (!storageKey) throw new Error('Missing storage key');
  await ensurePostgresSchema();
  const query = getSql();
  const json = JSON.stringify(value);
  await query`
    INSERT INTO faction_storage (key, value, updated_at)
    VALUES (${storageKey}, ${json}::jsonb, NOW())
    ON CONFLICT (key) DO UPDATE SET
      value = EXCLUDED.value,
      updated_at = NOW()
  `;
}

export function getPostgresStorageStatus() {
  return {
    configured: isPostgresConfigured(),
    table: 'faction_storage',
    keys: Object.values(ADMIN_STORAGE_KEYS),
  };
}
