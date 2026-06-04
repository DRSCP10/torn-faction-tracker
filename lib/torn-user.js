import { formatTornError } from './torn-errors.js';

const BASE = 'https://api.torn.com';

/**
 * Resolve Torn player from their personal API key (not faction key).
 */
export async function getUserFromApiKey(apiKey) {
  const key = String(apiKey || '').trim();
  if (!key) throw new Error('API key required');

  const res = await fetch(`${BASE}/user/?selections=basic&key=${key}`);
  const data = await res.json();

  if (data.error) {
    throw new Error(formatTornError(data));
  }

  const id = String(data.player_id ?? data.user_id ?? data.ID ?? '');
  const name = data.name || data.username;
  if (!id || !name) throw new Error('Could not read user from API key');

  return { id, name };
}
