import fs from 'fs';
import path from 'path';

export function canWriteDataLocal() {
  if (process.env.VERCEL === '1' && !process.env.ALLOW_LOCAL_DATA_WRITE) {
    return false;
  }
  try {
    const dir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

export async function loadDataFile(filePath, defaultValue) {
  const full = path.join(process.cwd(), filePath);
  if (fs.existsSync(full)) {
    return JSON.parse(fs.readFileSync(full, 'utf8'));
  }

  const owner = process.env.GITHUB_OWNER || 'bnc2022mf';
  const repo = process.env.GITHUB_REPO || 'torn-faction-tracker';
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/${filePath}`
  );
  if (res.ok) return res.json();
  return typeof defaultValue === 'function' ? defaultValue() : defaultValue;
}

export async function saveDataFile(filePath, data, commitMessage) {
  const content = JSON.stringify(data, null, 2);

  if (canWriteDataLocal()) {
    const full = path.join(process.cwd(), filePath);
    fs.mkdirSync(path.dirname(full), { recursive: true });
    fs.writeFileSync(full, content);
    return { method: 'local' };
  }

  const token = process.env.GITHUB_ACCESS_TOKEN || process.env.GITHUB_TOKEN;
  if (!token) {
    throw new Error(
      'Cannot save: set GITHUB_ACCESS_TOKEN (repo write) for Vercel admin saves'
    );
  }

  await saveToGitHub(filePath, content, commitMessage, token);
  return { method: 'github' };
}

async function saveToGitHub(filePath, content, message, token) {
  const owner = process.env.GITHUB_OWNER || 'bnc2022mf';
  const repo = process.env.GITHUB_REPO || 'torn-faction-tracker';

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
    message,
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
