import fs from 'fs';
import path from 'path';
import { isDataFile } from './torn-day.js';

const ACCESS_PATH = path.join(process.cwd(), 'data', 'access.json');

const DEFAULT_ACCESS = { version: 1, users: [] };

export async function loadAccessList() {
  if (process.env.ACCESS_ALLOWLIST) {
    try {
      return JSON.parse(process.env.ACCESS_ALLOWLIST);
    } catch {
      console.warn('Invalid ACCESS_ALLOWLIST JSON');
    }
  }

  if (fs.existsSync(ACCESS_PATH)) {
    return JSON.parse(fs.readFileSync(ACCESS_PATH, 'utf8'));
  }

  const owner = process.env.GITHUB_OWNER || 'bnc2022mf';
  const repo = process.env.GITHUB_REPO || 'torn-faction-tracker';
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/data/access.json`
  );
  if (res.ok) return res.json();

  return { ...DEFAULT_ACCESS };
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
  const content = JSON.stringify(access, null, 2);

  if (canWriteLocal()) {
    fs.mkdirSync(path.dirname(ACCESS_PATH), { recursive: true });
    fs.writeFileSync(ACCESS_PATH, content);
    return { method: 'local' };
  }

  const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      'Cannot save access list: set GITHUB_ACCESS_TOKEN or run locally'
    );
  }

  await saveAccessToGitHub(access, content, token);
  return { method: 'github' };
}

function canWriteLocal() {
  if (process.env.VERCEL === '1' && !process.env.ALLOW_LOCAL_ACCESS_WRITE) {
    return false;
  }
  try {
    const dir = path.dirname(ACCESS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

async function saveAccessToGitHub(access, content, token) {
  const owner = process.env.GITHUB_OWNER || 'bnc2022mf';
  const repo = process.env.GITHUB_REPO || 'torn-faction-tracker';
  const filePath = 'data/access.json';

  const metaRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
      },
    }
  );

  const body = {
    message: `access: update allowlist (${access.users?.length ?? 0} users)`,
    content: Buffer.from(content).toString('base64'),
  };

  if (metaRes.ok) {
    const meta = await metaRes.json();
    body.sha = meta.sha;
  }

  const putRes = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/vnd.github+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  );

  if (!putRes.ok) {
    const err = await putRes.json().catch(() => ({}));
    throw new Error(err.message || 'GitHub save failed');
  }
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
  return isDataFile(name) && name !== 'access.json';
}
