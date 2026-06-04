# Torn Faction Tracker

Faction dashboard and Discord bot for Torn factions. Tracks respect, chain performance, underperformers, and faction upgrade progress.

## Features

### Private access
- **Members** log in with their **Torn API key** — server verifies identity with Torn and checks `data/access.json`
- **Officers** manage access at **`/admin.html`** (username + Torn ID, e.g. Dwayne `345343`)
- Faction stats use server `TORN_API_KEY` only — member keys are never stored

### Dashboard
- **Torn day** stats (12:00–11:59 UTC) — aligned with Torn time
- **Live:** online/idle for chains, copy ping text, profile + message links
- **Perk bar:** available respect → next upgrade (from Torn `upgrades` API), or rank fallback
- **History / Analytics / Compare / All-time**
- **Underperformers:** median chain avg, low-respect hit count
- **Export** analytics report to clipboard

### Discord
- `/respect` — pick a date, full summary embed
- `/online` — who is online for chains

### Data pipeline
- Daily GitHub Action at **12:05 UTC** (after Torn day ends)
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
| `ADMIN_PASSWORD` | Officer login for `/admin.html` |
| `GITHUB_ACCESS_TOKEN` | Saves allowlist from Vercel admin UI |
| `DISCORD_WEBHOOK_URL` | Daily summary to Discord (Action secret) |
| `DISCORD_BOT_TOKEN` / `DISCORD_CLIENT_ID` / `DISCORD_GUILD_ID` | Bot |
| `APP_URL` + `BOT_API_SECRET` | Bot reads deployed API |

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
3. Set `GITHUB_ACCESS_TOKEN` if officers will edit allowlist on production admin
4. `npx vercel --prod`

### Onboarding members

1. Officer opens `/admin.html` → logs in with `ADMIN_PASSWORD`
2. Adds **Dwayne** with ID **345343** (and each other member)
3. Member opens dashboard → enters **their** API key → Torn confirms they are Dwayne → access granted

## GitHub Action

Secret `TORN_API_KEY`. Optional `DISCORD_WEBHOOK_URL`. Runs at 12:05 UTC, normal `git push` (no force).

## API routes

| Route | Description |
|-------|-------------|
| `POST /api/auth` | Member login (body: `{ apiKey }`) |
| `POST /api/admin/auth` | Admin login |
| `GET/POST/DELETE /api/admin/users` | Manage allowlist |
| `POST /api/logout` | Clear session |
| `GET /api/live` | Live Torn day stats |
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
