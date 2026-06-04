import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const BOT_DIR = path.dirname(fileURLToPath(import.meta.url));

/** Load bot/.env into process.env (Pi-friendly; does not override existing env). */
function loadBotEnvFile() {
  const envPath = path.join(BOT_DIR, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim();
    if (!t || t.startsWith('#')) continue;
    const i = t.indexOf('=');
    if (i < 1) continue;
    const key = t.slice(0, i).trim();
    const val = t.slice(i + 1).trim();
    if (!(key in process.env) || process.env[key] === '') {
      process.env[key] = val;
    }
  }
}

loadBotEnvFile();

/** Repository root (parent of bot/). */
export const REPO_ROOT = path.resolve(
  process.env.REPO_ROOT || path.join(BOT_DIR, '..')
);

export function getDataMode() {
  if (process.env.BOT_FORCE_REMOTE === '1') return 'remote';
  if (process.env.TORN_API_KEY) return 'local';
  if (process.env.APP_URL) return 'remote';
  return 'none';
}

export function getDiscordConfig() {
  return {
    token: process.env.DISCORD_BOT_TOKEN,
    clientId: process.env.DISCORD_CLIENT_ID,
    guildId: process.env.DISCORD_GUILD_ID || '',
  };
}

export function getRemoteConfig() {
  const appUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
  const botSecret = process.env.BOT_API_SECRET || '';
  return { appUrl, botSecret };
}

export function getDashboardUrl() {
  const { appUrl } = getRemoteConfig();
  return appUrl || process.env.DASHBOARD_URL || '';
}

/** Ensure data/*.json resolves when running via systemd from repo root. */
export function ensureRepoCwd() {
  if (process.env.DATA_DIR) {
    process.env.TORN_DATA_DIR = process.env.DATA_DIR;
  }
  const mode = getDataMode();
  if (mode === 'local' && process.cwd() !== REPO_ROOT) {
    process.chdir(REPO_ROOT);
  }
}
