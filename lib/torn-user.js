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
    const code = data.error.code;
    if (code === 2) throw new Error('Invalid API key');
    if (code === 16) throw new Error('API key access level too low');
    throw new Error(data.error.error || 'Torn API error');
  }

  const id = String(data.player_id ?? data.user_id ?? data.ID ?? '');
  const name = data.name || data.username;
  if (!id || !name) throw new Error('Could not read user from API key');

  return { id, name };
}
