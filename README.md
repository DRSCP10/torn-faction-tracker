# Torn Faction Tracker

Faction dashboard and Discord bot for Torn factions. Tracks respect, chain performance, underperformers, and faction upgrade progress.

## Features

### Private access
- **Members** log in with their **Torn API key** — server verifies identity with Torn and checks `data/access.json`
- **Officers** manage access, secrets, and app settings at **`/admin.html`** (username + Torn ID, e.g. Dwayne `345343`)
- Faction stats use server `TORN_API_KEY` only — member keys are never stored

### Dashboard
- **Torn day** stats (12:00–11:59 **TCT**) — Torn City Time (fixed UTC/GMT, no DST)
- **Live:** online/idle for chains, copy ping text, profile + message links
- **Perk bar:** available respect → next upgrade (from Torn `upgrades` API), or rank fallback
- **History / Analytics / Compare / All-time**
- **Underperformers:** median chain avg, low-respect hit count
- **Export** analytics report to clipboard

### Discord
- `/respect` — pick a date, full summary embed
- `/online` — who is online for chains

### Data pipeline
- Daily GitHub Action at **12:05 TCT** (12:05 UTC — after Torn day ends)
- Writes `data/YYYY-MM-DD.json` + rebuilds `data/index.json` (fast charts)
- Optional **Discord webhook** auto-post after fetch

## Setup

```bash
cp .env.example .env
npm install
npm run bot:install   # only if running the Discord bot locally
```

The root project has **no npm dependencies** on Vercel (API routes use Node built-ins only). The Discord bot installs from `bot/package.json`.

| Variable | Purpose |
|----------|---------|
| `TORN_API_KEY` | Faction API key (server-side) |
| `SESSION_SECRET` | Signs session cookies (required) |
| `ADMIN_PASSWORD` | Officer login (optional if you set password in Admin → Secrets) |
| `POSTGRES_URL` | **Recommended** — allowlist + settings in Vercel Postgres (Neon); set via Storage → Postgres |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | Alternative — Redis / Vercel KV |
| `GITHUB_ACCESS_TOKEN` | Alternative — commits `data/access.json` and `data/settings.json` from admin |
| `SETTINGS_ENCRYPTION_KEY` | Optional override for encrypting stored API keys (defaults to `SESSION_SECRET`) |
| `DISCORD_WEBHOOK_URL` | Daily summary to Discord (Action secret) |
| `DISCORD_BOT_TOKEN` / `DISCORD_CLIENT_ID` / `DISCORD_GUILD_ID` | Bot |
| `APP_URL` + `BOT_API_SECRET` | Bot reads deployed API (or set in Admin → App settings / Secrets) |

## Commands

```bash
npm run dev              # vercel dev
npm run fetch            # fetch last completed Torn day
npm run rebuild-index    # rebuild data/index.json from data/*.json
npm test
npm run bot:install && npm run bot   # Discord bot (long-running host)
```

### Backfill (Torn day windows)

```bash
BACKFILL_FROM=2026-05-01 TORN_API_KEY=xxx node fetch_stats.js
npm run rebuild-index
```

## Deploy (Vercel)

1. Import repo on Vercel
2. Set `TORN_API_KEY`, `SESSION_SECRET`, `ADMIN_PASSWORD`
3. For admin edits on production, add **Vercel Postgres** (recommended) or `GITHUB_ACCESS_TOKEN` (see below)
4. `npx vercel --prod`

### Admin storage (allowlist + settings)

Daily stats (`data/YYYY-MM-DD.json`) stay in the repo and are updated by the GitHub Action. Only the **allowlist** and **admin settings** need writable storage on Vercel.

| Option | Pros | Setup |
|--------|------|--------|
| **Vercel Postgres (Neon)** (recommended) | Real DB, free tier, fits Vercel | Project → **Storage** → **Postgres** → Create → Connect. Vercel sets `POSTGRES_URL`. Redeploy. |
| **Upstash Redis** | Simple key-value | Storage → **Redis** → Connect (`KV_REST_API_*`). |
| **GitHub API** | No extra service | PAT with repo **Contents: Read and write**. Set `GITHUB_ACCESS_TOKEN`. |
| **Local dev** | — | Writes to `data/access.json` and `data/settings.json` on disk. |

On first admin save with Postgres connected, the app creates a `faction_storage` table and stores JSON under keys `access` and `settings`. Until then, it falls back to repo files on read.

Optional manual init:

```bash
npm run db:init   # requires POSTGRES_URL in env
```

### Onboarding members

1. Officer opens `/admin.html` → logs in (`ADMIN_PASSWORD` or password saved in Secrets tab)
2. **Access** tab: add **Dwayne** with ID **345343** (and each other member)
3. **Secrets** tab (optional): store faction API key and rotate officer password without redeploying Vercel
4. Member opens dashboard → enters **their** API key → Torn confirms they are Dwayne → access granted

## GitHub Action

Secret `TORN_API_KEY`. Optional `DISCORD_WEBHOOK_URL`. Runs at 12:05 TCT (UTC), normal `git push` (no force).

## API routes

| Route | Description |
|-------|-------------|
| `POST /api/auth` | Member login (body: `{ apiKey }`) |
| `POST /api/admin/auth` | Admin login |
| `GET/POST/DELETE /api/admin/users` | Manage allowlist |
| `GET/PATCH /api/admin/settings` | Public settings + status |
| `POST /api/admin/secrets` | Password / faction API key |
| `POST /api/admin/test-torn` | Test faction API connection |
| `POST /api/admin/test-bot` | Test bot → API auth |
| `POST /api/logout` | Clear session |
| `GET /api/live` | Live stats for **today’s calendar date** (00:00–23:59 TCT), with paginated attack fetches |
| `GET /api/hits-today` | Full attack log for today (table report; also at `/hits-today`) |
| `GET /api/online` | Online list + ping text |
| `GET /api/history?limit=14` | Chart summaries (from index) |
| `GET /api/day?date=` | Full day + analytics |
| `GET /api/compare?dateA=&dateB=` | Day-over-day deltas |
| `GET /api/alltime` | Aggregated member totals |
| `GET /api/summary?date=` | Text report (bot/export) |

Rate limited to 40 req/min per IP on live/history endpoints.

## Underperformers

Members with **5+ chain hits** whose **chain avg respect** is below **50% of the median** among chain participants, or **3+ hits** under 0.5 respect, are flagged.

## Project layout

```
api/           Vercel serverless (+ api/admin/)
lib/           Stats, auth, access, Torn user verify
public/        index.html, admin.html
bot/           Discord
data/          stats JSON, index.json, access.json
scripts/       rebuild-index
tests/         Unit tests
```
