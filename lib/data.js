import fs from 'fs';
import path from 'path';
import { isDataFile } from './torn-day.js';
import { loadIndex } from './index-store.js';

const DATA_DIR = path.join(process.cwd(), 'data');

export function listDates() {
  if (!fs.existsSync(DATA_DIR)) return [];
  const indexPath = path.join(DATA_DIR, 'index.json');
  if (fs.existsSync(indexPath)) {
    try {
      const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
      if (index.dates?.length) return index.dates;
    } catch {
      /* fall through */
    }
  }
  return fs
    .readdirSync(DATA_DIR)
    .filter(isDataFile)
    .map((f) => f.replace('.json', ''))
    .sort();
}

export function loadDay(date) {
  const file = path.join(DATA_DIR, `${date}.json`);
  if (!fs.existsSync(file)) return null;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

export async function listDatesFromGitHub() {
  const owner = process.env.GITHUB_OWNER || 'bnc2022mf';
  const repo = process.env.GITHUB_REPO || 'torn-faction-tracker';

  const indexRes = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/data/index.json`
  );
  if (indexRes.ok) {
    const index = await indexRes.json();
    if (index.dates?.length) return index.dates;
  }

  const res = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/data`
  );
  if (!res.ok) return [];
  const files = await res.json();
  if (!Array.isArray(files)) return [];
  return files
    .filter((f) => f.name.endsWith('.json') && f.name !== 'index.json')
    .map((f) => f.name.replace('.json', ''))
    .sort();
}

export async function loadDayFromGitHub(date) {
  const owner = process.env.GITHUB_OWNER || 'bnc2022mf';
  const repo = process.env.GITHUB_REPO || 'torn-faction-tracker';
  const res = await fetch(
    `https://raw.githubusercontent.com/${owner}/${repo}/main/data/${date}.json`
  );
  if (!res.ok) return null;
  return res.json();
}

export async function getDates() {
  const local = listDates();
  if (local.length > 0) return local;
  return listDatesFromGitHub();
}

export async function getDay(date) {
  const local = loadDay(date);
  if (local) return local;
  return loadDayFromGitHub(date);
}

export { loadIndex };
