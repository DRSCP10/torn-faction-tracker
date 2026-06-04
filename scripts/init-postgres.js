/**
 * Create faction_storage table. Run once after connecting Neon on Vercel.
 * Usage: POSTGRES_URL=postgres://... node scripts/init-postgres.js
 */
import { ensurePostgresSchema, isPostgresConfigured } from '../lib/postgres-store.js';

if (!isPostgresConfigured()) {
  console.error('Set POSTGRES_URL (from Vercel Storage → Postgres)');
  process.exit(1);
}

await ensurePostgresSchema();
console.log('OK: faction_storage table ready');
