import { loadDataFile, saveDataFile } from './github-store.js';
import { getKvStorageStatus, isKvConfigured } from './kv-store.js';
import {
  getPostgresStorageStatus,
  isPostgresConfigured,
} from './postgres-store.js';
import { hashPassword, verifyPassword } from './password.js';
import { decryptSecret, encryptSecret, maskSecret } from './crypto-store.js';

const SETTINGS_PATH = 'data/settings.json';

const DEFAULT_SETTINGS = () => ({
  version: 1,
  updatedAt: null,
  public: {
    factionDisplayName: '',
    discordWebhookUrl: '',
    appUrl: '',
    analytics: {
      minChainHits: 5,
      ratioThreshold: 0.5,
      lowHitThreshold: 3,
      minHitsLegacy: 8,
    },
  },
  secrets: {},
  audit: [],
});

export async function loadSettings() {
  const data = await loadDataFile(SETTINGS_PATH, DEFAULT_SETTINGS);
  const defaults = DEFAULT_SETTINGS();
  return {
    ...defaults,
    ...data,
    public: {
      ...defaults.public,
      ...data.public,
      analytics: {
        ...defaults.public.analytics,
        ...data.public?.analytics,
      },
    },
  };
}

export async function saveSettings(settings) {
  settings.updatedAt = new Date().toISOString();
  return saveDataFile(SETTINGS_PATH, settings, 'admin: update settings');
}

export function appendAudit(settings, entry) {
  settings.audit = [{ ...entry, at: new Date().toISOString() }, ...(settings.audit || [])].slice(0, 100);
}

export async function isAdminConfigured() {
  if (process.env.ADMIN_PASSWORD) return true;
  const s = await loadSettings();
  return Boolean(s.secrets?.adminPasswordHash);
}

export async function verifyAdminPassword(input) {
  if (process.env.ADMIN_PASSWORD && input === process.env.ADMIN_PASSWORD) {
    return true;
  }
  const settings = await loadSettings();
  const hash = settings.secrets?.adminPasswordHash;
  if (hash) return verifyPassword(input, hash);
  return false;
}

export async function getTornApiKey() {
  if (process.env.TORN_API_KEY) return process.env.TORN_API_KEY;
  const settings = await loadSettings();
  const dec = decryptSecret(settings.secrets?.tornApiKeyEnc);
  if (dec) return dec;
  return null;
}

export async function getAppUrl() {
  const fromEnv = (process.env.APP_URL || '').trim();
  if (fromEnv) return fromEnv.replace(/\/$/, '');
  const settings = await loadSettings();
  const url = (settings.public?.appUrl || '').trim();
  return url ? url.replace(/\/$/, '') : '';
}

export async function getBotApiSecret() {
  if (process.env.BOT_API_SECRET) return process.env.BOT_API_SECRET;
  const settings = await loadSettings();
  return decryptSecret(settings.secrets?.botApiSecretEnc) || null;
}

export function getAnalyticsOptions(settings) {
  return settings?.public?.analytics || DEFAULT_SETTINGS().public.analytics;
}

export async function getSettingsForAdmin() {
  const settings = await loadSettings();
  const tornFromEnv = Boolean(process.env.TORN_API_KEY);
  const tornFromStore = Boolean(settings.secrets?.tornApiKeyEnc);
  let tornPreview = null;
  if (tornFromEnv) tornPreview = maskSecret(process.env.TORN_API_KEY);
  else if (tornFromStore) tornPreview = maskSecret(decryptSecret(settings.secrets.tornApiKeyEnc));

  const appUrlFromEnv = Boolean(process.env.APP_URL);
  const appUrlFromStore = Boolean(settings.public?.appUrl);
  const botFromEnv = Boolean(process.env.BOT_API_SECRET);
  const botFromStore = Boolean(settings.secrets?.botApiSecretEnc);
  let botPreview = null;
  if (botFromEnv) botPreview = maskSecret(process.env.BOT_API_SECRET);
  else if (botFromStore) botPreview = maskSecret(decryptSecret(settings.secrets.botApiSecretEnc));

  return {
    public: settings.public,
    status: {
      adminFromEnv: Boolean(process.env.ADMIN_PASSWORD),
      adminFromStore: Boolean(settings.secrets?.adminPasswordHash),
      tornFromEnv,
      tornFromStore,
      tornPreview,
      appUrlFromEnv,
      appUrlFromStore,
      appUrl: appUrlFromEnv
        ? process.env.APP_URL.replace(/\/$/, '')
        : settings.public?.appUrl || '',
      botFromEnv,
      botFromStore,
      botPreview,
      sessionSecretFromEnv: Boolean(process.env.SESSION_SECRET),
      postgresConfigured: isPostgresConfigured(),
      postgresStorage: getPostgresStorageStatus(),
      kvConfigured: isKvConfigured(),
      kvStorage: getKvStorageStatus(),
      githubSave: Boolean(process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN) || !process.env.VERCEL,
      adminSave:
        isPostgresConfigured() ||
        isKvConfigured() ||
        Boolean(process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN) ||
        !process.env.VERCEL,
    },
    audit: (settings.audit || []).slice(0, 20),
  };
}

export async function updateAdminSecrets({
  currentPassword,
  newAdminPassword,
  tornApiKey,
  clearTornApiKey,
  botApiSecret,
  clearBotApiSecret,
}) {
  const valid = await verifyAdminPassword(currentPassword);
  if (!valid) throw new Error('Current admin password is wrong');

  const settings = await loadSettings();
  if (!settings.secrets) settings.secrets = {};

  if (newAdminPassword) {
    if (newAdminPassword.length < 8) {
      throw new Error('New password must be at least 8 characters');
    }
    settings.secrets.adminPasswordHash = hashPassword(newAdminPassword);
    appendAudit(settings, { action: 'admin_password_changed' });
  }

  if (clearTornApiKey) {
    delete settings.secrets.tornApiKeyEnc;
    appendAudit(settings, { action: 'torn_api_key_cleared' });
  } else if (tornApiKey) {
    settings.secrets.tornApiKeyEnc = encryptSecret(tornApiKey.trim());
    appendAudit(settings, { action: 'torn_api_key_updated' });
  }

  if (clearBotApiSecret) {
    delete settings.secrets.botApiSecretEnc;
    appendAudit(settings, { action: 'bot_api_secret_cleared' });
  } else if (botApiSecret) {
    const trimmed = botApiSecret.trim();
    if (trimmed.length < 16) {
      throw new Error('Bot API secret must be at least 16 characters');
    }
    settings.secrets.botApiSecretEnc = encryptSecret(trimmed);
    appendAudit(settings, { action: 'bot_api_secret_updated' });
  }

  await saveSettings(settings);
  return { ok: true };
}

export async function updatePublicSettings(currentPassword, publicPatch) {
  const valid = await verifyAdminPassword(currentPassword);
  if (!valid) throw new Error('Current admin password is wrong');

  const settings = await loadSettings();
  settings.public = { ...settings.public, ...publicPatch };
  if (publicPatch.analytics) {
    settings.public.analytics = { ...settings.public.analytics, ...publicPatch.analytics };
  }
  appendAudit(settings, { action: 'public_settings_updated' });
  await saveSettings(settings);
  return settings.public;
}
