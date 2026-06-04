/** Keys for allowlist + settings (not daily stats in data/*.json). */

export const ADMIN_STORAGE_KEYS = {
  'data/access.json': 'access',
  'data/settings.json': 'settings',
};

export function storageKeyForPath(filePath) {
  return ADMIN_STORAGE_KEYS[filePath] || null;
}

export function isAdminBackedPath(filePath) {
  return Boolean(storageKeyForPath(filePath));
}
