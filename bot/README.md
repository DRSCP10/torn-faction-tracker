# Faction Tracker — Discord Bot

Discord slash commands that mirror the **web dashboard**: live stats, hits reports, chain pings, history, analytics, compare, and all-time totals.

Designed to run on a **Raspberry Pi** (or any always-on host) beside the repo, using your faction API key and local `data/` snapshots.

## Quick start (Raspberry Pi)

```bash
# On the Pi, clone the repo
cd ~
git clone https://github.com/DRSCP10/torn-faction-tracker.git
cd torn-faction-tracker

# Install bot dependencies only
npm run bot:install

# Configure
cp bot/.env.example bot/.env
nano bot/.env   # DISCORD_* + TORN_API_KEY

# Pull daily stats (optional if you rely on git pull for data/)
npm run fetch   # needs TORN_API_KEY in repo .env or bot/.env won't load for fetch

# Run bot (from repo root — important for data/ path)
# bot/.env is loaded automatically on startup
npm run bot
```

You can also put `TORN_API_KEY` in the repo root `.env`; `fetch_stats` uses that path for `npm run fetch`.

Use a **guild** `DISCORD_GUILD_ID` so slash commands appear immediately after restart.

## Data modes

| Mode | When | What it uses |
|------|------|----------------|
| **local** (Pi) | `TORN_API_KEY` is set | Imports `../lib/*` directly — live Torn API + `data/*.json` on disk |
| **remote** | `APP_URL` + `BOT_API_SECRET` | HTTP calls to deployed Vercel app (`/api/live`, `/api/today`, …) |
| **none** | Neither | Bot starts but commands error with setup hint |

Force remote even with a local key: `BOT_FORCE_REMOTE=1`.

### Local mode requirements

1. **`TORN_API_KEY`** — faction key with **Faction API Access** (attacks, basic, upgrades).
2. **`data/`** — daily JSON files (`npm run fetch` or git pull from GitHub Action).
3. Run from **repository root** (`npm run bot` sets cwd via `ensureRepoCwd()`).

War start / inactive thresholds: set in **Admin → App settings** on Vercel and sync `data/settings.json`, or use env `WAR_STARTED_AT` (unix) on the Pi.

## Slash commands

| Command | Dashboard feature |
|---------|-------------------|
| `/help` | Command list + data mode |
| `/dashboard` | Live overview (metrics, top hitters, no-hit list) |
| `/live` | Full live stats embed |
| `/today` | Hits, respect, top hitters, report link |
| `/hits` | Attack log summary by result + report URL |
| `/inactive` | Members with 0 offensive hits |
| `/leaderboard` | Top respect earners (`limit`) |
| `/online` | Online / idle for chains |
| `/chain` | Copy-paste chain ping |
| `/member` | One member’s stats (`name`) |
| `/perks` | Next upgrade progress |
| `/respect` | Pick a stored Torn day — text summary |
| `/day` | Pick a stored day — top members |
| `/analytics` | Pick a day — underperformers |
| `/compare` | Two dates (`date_a`, `date_b`, autocomplete) |
| `/history` | Last N days totals (`days`) |
| `/alltime` | Cumulative member stats |
| `/dates` | List `data/YYYY-MM-DD.json` dates |

Many live commands accept **`window`**: `Calendar day (TCT)` or `Since war start` (needs war start configured).

## Project layout

```
bot/
  index.js              # Entry point
  config.js             # Env + repo root
  data-source.js        # Local vs remote data access
  embeds.js             # Discord embed builders
  util.js               # Shared helpers
  register-commands.js  # Slash command registration
  commands/
    definitions.js      # All slash command schemas
    handler.js          # Command + menu routing
  README.md
  .env.example
```

## systemd service (Pi)

```ini
# /etc/systemd/system/torn-faction-bot.service
[Unit]
Description=Torn Faction Discord Bot
After=network-online.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/torn-faction-tracker
EnvironmentFile=/home/pi/torn-faction-tracker/bot/.env
ExecStart=/usr/bin/node bot/index.js
Restart=on-failure
RestartSec=15

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable torn-faction-bot
sudo systemctl start torn-faction-bot
journalctl -u torn-faction-bot -f
```

## Daily stats on the Pi

Option A — cron fetch at 12:05 TCT (UTC):

```cron
5 12 * * * cd /home/pi/torn-faction-tracker && /usr/bin/node fetch_stats.js >> /home/pi/fetch.log 2>&1
```

Option B — `git pull` after the GitHub Action commits new `data/` files.

## Remote mode (Vercel)

If the Pi should not hold `TORN_API_KEY`:

1. Deploy dashboard to Vercel with `TORN_API_KEY`, `SESSION_SECRET`, storage.
2. Admin → set **App URL** and **Bot API secret** (16+ chars).
3. On Pi `bot/.env`:

```env
APP_URL=https://your-app.vercel.app
BOT_API_SECRET=same-secret-as-admin
DASHBOARD_URL=https://your-app.vercel.app
```

Bot calls `/api/*` with header `x-bot-secret: …`.

## Troubleshooting

| Issue | Fix |
|-------|-----|
| Commands don’t appear | Set `DISCORD_GUILD_ID`; restart bot; check bot invite has `applications.commands` |
| `Not configured` | Set `TORN_API_KEY` or `APP_URL` + `BOT_API_SECRET` |
| No historical dates | Run `npm run fetch` or pull `data/` from git |
| `Since war` disabled | Set war start in Admin or `WAR_STARTED_AT` env |
| API error 7 / 16 | Enable faction API selections on Torn key |
| Wrong stats path | Start bot from repo root (`WorkingDirectory` in systemd) |

## Development

From repo root:

```bash
npm run bot:install
# copy bot/.env.example → bot/.env
npm run bot
```

After changing `commands/definitions.js`, restart the bot to re-register commands.
