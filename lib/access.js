import { isDataFile } from './torn-day.js';
import { loadDataFile, saveDataFile } from './github-store.js';

const ACCESS_PATH = 'data/access.json';

const DEFAULT_ACCESS = { version: 1, users: [] };

export async function loadAccessList() {
  if (process.env.ACCESS_ALLOWLIST) {
    try {
      return JSON.parse(process.env.ACCESS_ALLOWLIST);
    } catch {
      console.warn('Invalid ACCESS_ALLOWLIST JSON');
    }
  }

  return loadDataFile(ACCESS_PATH, DEFAULT_ACCESS);
}

export function findAllowedUser(access, tornUser) {
  const id = String(tornUser.id);
  return (access.users || []).find((u) => String(u.id) === id);
}

export function isUserAllowed(access, tornUser) {
  return Boolean(findAllowedUser(access, tornUser));
}

export async function saveAccessList(access) {
  access.updatedAt = new Date().toISOString();
  return saveDataFile(
    ACCESS_PATH,
    access,
    `access: update allowlist (${access.users?.length ?? 0} users)`
  );
}

export function addUser(access, { id, name, addedBy }) {
  const userId = String(id).trim();
  const userName = String(name).trim();
  if (!userId || !userName) throw new Error('ID and username required');

  const users = access.users || [];
  if (users.some((u) => String(u.id) === userId)) {
    throw new Error('User ID already on allowlist');
  }

  users.push({
    id: userId,
    name: userName,
    addedAt: new Date().toISOString(),
    addedBy: addedBy || 'admin',
  });
  access.users = users;
  return access;
}

export function removeUser(access, id) {
  const userId = String(id);
  access.users = (access.users || []).filter((u) => String(u.id) !== userId);
  return access;
}

/** Exclude access.json from date file scans */
export function isStatsDataFile(name) {
  return isDataFile(name) && name !== 'access.json' && name !== 'settings.json';
}
