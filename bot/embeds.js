import { EmbedBuilder } from 'discord.js';
import { fmtNum, truncate, reportUrl } from './util.js';
import { getDashboardUrl } from './config.js';

const COLORS = {
  live: 0xe84040,
  today: 0x3b82f6,
  online: 0x22c55e,
  respect: 0xf97316,
  history: 0xa855f7,
  compare: 0x06b6d4,
  warn: 0xeab308,
  neutral: 0x6b7280,
};

export function embedLive(live) {
  const t = live.totals || {};
  const lines = [
    `**${live.name}** · ${live.dayWindow || 'Today'}`,
    live.dayBounds ? `_${live.dayBounds.from} → ${live.dayBounds.to}_` : '',
    '',
    `**Respect** ${fmtNum(t.respect)} · **Hits** ${t.hits ?? 0} · **Assists** ${t.assists ?? 0}`,
    `**Losses** ${t.losses ?? 0} · **Chain hits** ${t.chainHits ?? 0}`,
    t.stealthAttacksOnUs
      ? `**Stealth on us:** ${t.stealthAttacksOnUs}`
      : '',
    `**Online** ${live.online?.length ?? 0} · **Idle** ${live.idle?.length ?? 0}`,
    `Faction respect (all-time): **${(live.respect || 0).toLocaleString()}** · Rank: ${live.rank?.name || '—'}`,
  ].filter(Boolean);

  const url = reportUrl(live);
  const dash = getDashboardUrl();
  const embed = new EmbedBuilder()
    .setTitle('Live faction stats')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.live)
    .setFooter({ text: `Mode: ${live.statsMode || 'calendar'} · TCT` });
  if (url) embed.setURL(url);
  if (dash) embed.addFields({ name: 'Dashboard', value: dash });
  return embed;
}

export function embedDashboard(data) {
  const t = data.totals || {};
  const top = (data.topHitters || [])
    .slice(0, 5)
    .map((m, i) => `${i + 1}. **${m.name}** — ${m.hits}h / ${fmtNum(m.respect)}r`)
    .join('\n');
  const inactive = data.inactiveHitters;
  let inactiveLine = '_Everyone has hit (or list not unlocked yet)_';
  if (inactive?.eligible && inactive.members?.length) {
    inactiveLine = `**${inactive.members.length}** waiting: ${inactive.members.map((m) => m.name).join(', ')}`;
  }

  const lines = [
    `**${data.name}**`,
    data.dayWindow || '',
    '',
    `📊 **Respect** ${fmtNum(t.respect)} · ⚔️ **Hits** ${t.hits ?? 0} · 🤝 **Assists** ${t.assists ?? 0} · 💀 **Losses** ${t.losses ?? 0}`,
    `🟢 **Online** ${data.online?.length ?? 0} · 🟡 **Idle** ${data.idle?.length ?? 0}`,
    '',
    '**Top hitters**',
    top || '_None yet_',
    '',
    '**No hits yet**',
    inactiveLine,
  ];

  const embed = new EmbedBuilder()
    .setTitle('Faction dashboard')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.today);
  const url = reportUrl(data);
  if (url) embed.setURL(url);
  const dash = getDashboardUrl();
  if (dash) {
    embed.addFields(
      { name: 'Web dashboard', value: dash },
      url ? { name: 'Hits report', value: url } : { name: '\u200b', value: '\u200b' }
    );
  }
  return embed;
}

export function embedToday(data) {
  const t = data.totals || {};
  const topLines =
    data.topHitters?.length > 0
      ? data.topHitters
          .map(
            (m, i) =>
              `${i + 1}. **${m.name}** — ${m.hits} hits (${fmtNum(m.respect)}r)`
          )
          .join('\n')
      : '_No offensive hits yet_';
  const inactive = data.inactiveHitters;
  let inactiveBlock = '';
  if (inactive?.eligible && inactive.members?.length) {
    inactiveBlock = `\n**No hits yet (${inactive.members.length}):**\n${inactive.members.map((m) => m.name).join(', ')}`;
  } else if (inactive && !inactive.eligible) {
    inactiveBlock = `\n_No-hit list after ${inactive.inactiveAfterHours}h (${inactive.elapsedHours}h elapsed)._`;
  }
  const best = (data.bestHitsToday || [])
    .slice(0, 3)
    .map((h) => `• ${fmtNum(h.respect)}r on **${h.target}** — ${h.member}`)
    .join('\n');

  const lines = [
    `**${data.name}** · ${data.dayWindow || 'Today'}`,
    `**Hits:** ${t.hits ?? 0} · **Respect:** ${fmtNum(t.respect)} · **Losses:** ${t.losses ?? 0}`,
    t.stealthAttacksOnUs ? `**Stealth on us:** ${t.stealthAttacksOnUs}` : '',
    '',
    '**Top hitters**',
    topLines,
    best ? `\n**Best hits**\n${best}` : '',
    inactiveBlock,
    reportUrl(data) ? `\n📋 [Full hits report](${reportUrl(data)})` : '',
  ].filter(Boolean);

  const embed = new EmbedBuilder()
    .setTitle('Hits today')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.today);
  const url = reportUrl(data);
  if (url) embed.setURL(url);
  return embed;
}

export function embedOnline(data) {
  const lines = [
    `**${data.name}** · ${data.tornDate || 'Today'}`,
    '',
    `**Online (${data.online?.length ?? 0}):** ${(data.online || []).map((m) => m.name).join(', ') || '—'}`,
    `**Idle (${data.idle?.length ?? 0}):** ${(data.idle || []).map((m) => m.name).join(', ') || '—'}`,
    '',
    data.messageTemplate || data.copyText || '',
  ];
  return new EmbedBuilder()
    .setTitle("Chain — who's around")
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.online);
}

export function embedLeaderboard(members, title, windowLabel) {
  const lines = members.length
    ? members
        .map(
          (m, i) =>
            `${i + 1}. **${m.name}** — ${fmtNum(m.respect)}r · ${m.hits ?? 0} hits`
        )
        .join('\n')
    : '_No activity_';
  return new EmbedBuilder()
    .setTitle(title)
    .setDescription(truncate(`${windowLabel}\n\n${lines}`))
    .setColor(COLORS.today);
}

export function embedInactive(inactive, windowLabel) {
  if (!inactive?.eligible) {
    return new EmbedBuilder()
      .setTitle('No hits yet')
      .setDescription(
        `List unlocks after **${inactive?.inactiveAfterHours ?? 2}h** (${inactive?.elapsedHours ?? 0}h elapsed).\n${windowLabel}`
      )
      .setColor(COLORS.warn);
  }
  const names = inactive.members?.map((m) => m.name).join(', ') || '—';
  return new EmbedBuilder()
    .setTitle(`No hits yet (${inactive.members?.length ?? 0})`)
    .setDescription(truncate(`${windowLabel}\n\n${names}`))
    .setColor(COLORS.warn);
}

export function embedHitsSummary(report) {
  const s = report.summary || {};
  const byResult = Object.entries(s.byResult || {})
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `• **${k}:** ${v}`)
    .join('\n');
  const lines = [
    `**${report.factionName}** · ${report.dayWindow || ''}`,
    `Offensive hits: **${report.totals?.hits ?? s.offensiveHits ?? 0}**`,
    `Log rows: **${s.total ?? 0}** · Attacked us: **${s.attackedUs ?? 0}**`,
    '',
    '**By result**',
    byResult || '_None_',
    reportUrl(report)
      ? `\n[Open full table](${reportUrl(report)})`
      : '',
  ];
  return new EmbedBuilder()
    .setTitle('Hits report summary')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.today);
}

export function embedMember(member, windowLabel) {
  if (!member) {
    return new EmbedBuilder()
      .setTitle('Member not found')
      .setDescription('No matching roster member with activity in this window.')
      .setColor(COLORS.warn);
  }
  const lines = [
    `**${member.name}** [${member.id}]`,
    windowLabel,
    '',
    `Respect: **${fmtNum(member.respect)}**`,
    `Hits: **${member.hits ?? 0}** · Assists: **${member.assists ?? 0}** · Losses: **${member.losses ?? 0}**`,
    `Chain: **${member.chainHits ?? 0}** (${fmtNum(member.chainRespect ?? 0)}r)`,
    member.bestHit > 0
      ? `Best hit: **${fmtNum(member.bestHit)}** on ${member.bestHitTarget || '?'}`
      : '',
    member.stealthAttacksOnUs
      ? `Attacked in stealth: **${member.stealthAttacksOnUs}**×`
      : '',
    `Status: **${member.status || '—'}** (${member.lastAction || '—'})`,
  ].filter(Boolean);
  return new EmbedBuilder()
    .setTitle('Member stats')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.live);
}

export function embedPerks(live) {
  const p = live.perkProgress;
  if (!p) {
    return new EmbedBuilder()
      .setTitle('Perk progress')
      .setDescription('Upgrades data unavailable (API permissions or error).')
      .setColor(COLORS.neutral);
  }
  const lines = [
    `**${p.label || 'Next upgrade'}**`,
    `Progress: **${fmtNum(p.progress, 1)}%**`,
    p.remaining != null ? `Remaining: **${p.remaining}** respect` : '',
    p.cost != null ? `Cost: **${p.cost}**` : '',
  ].filter(Boolean);
  return new EmbedBuilder()
    .setTitle('Faction perks')
    .setDescription(lines.join('\n'))
    .setColor(COLORS.live);
}

export function embedCompare(cmp) {
  const lines = [
    `**${cmp.dateA}** → **${cmp.dateB}**`,
    `Respect Δ: **${cmp.respectDelta >= 0 ? '+' : ''}${fmtNum(cmp.respectDelta)}**`,
    `Total A: ${fmtNum(cmp.totalRespectA)} · B: ${fmtNum(cmp.totalRespectB)}`,
    '',
    '**Improved**',
    (cmp.improved || [])
      .slice(0, 8)
      .map((m) => `• ${m.name}: +${fmtNum(m.respectDelta)}r`)
      .join('\n') || '_None_',
    '',
    '**Declined**',
    (cmp.declined || [])
      .slice(0, 8)
      .map((m) => `• ${m.name}: ${fmtNum(m.respectDelta)}r`)
      .join('\n') || '_None_',
  ];
  return new EmbedBuilder()
    .setTitle('Compare days')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.compare);
}

export function embedHistory(days) {
  const lines = days
    .map(
      (d) =>
        `**${d.date}** — ${fmtNum(d.totalRespect)}r · ${d.totalHits ?? 0} hits · ${d.totalLosses ?? 0} losses`
    )
    .join('\n');
  return new EmbedBuilder()
    .setTitle('Recent history')
    .setDescription(truncate(lines || '_No history_'))
    .setColor(COLORS.history);
}

export function embedAlltime(data) {
  const top = (data.members || [])
    .slice(0, 15)
    .map(
      (m, i) =>
        `${i + 1}. **${m.name}** — ${fmtNum(m.respect)}r · ${m.hits ?? 0} hits · ${m.activeDays ?? 0}d`
    )
    .join('\n');
  return new EmbedBuilder()
    .setTitle(`All-time totals (${data.dayCount ?? '?'} days)`)
    .setDescription(truncate(top || '_No data_'))
    .setColor(COLORS.history);
}

export function embedAnalytics(day) {
  const under = (day.analytics?.underperformers || [])
    .slice(0, 12)
    .map((m) => `• **${m.name}** — ${m.reason} (${m.chainAvgHit ?? m.avgHit} avg)`)
    .join('\n');
  const top = (day.analytics?.topRespect || [])
    .slice(0, 5)
    .map((m, i) => `${i + 1}. **${m.name}** — ${fmtNum(m.respect)}r`)
    .join('\n');
  const lines = [
    `**${day.date}**`,
    `Total respect: **${fmtNum(day.meta?.totalRespect)}** · Hits: **${day.meta?.totalHits ?? '—'}**`,
    '',
    '**Top respect**',
    top || '_—_',
    '',
    '**Underperformers (chain)**',
    under || '_None flagged_',
  ];
  return new EmbedBuilder()
    .setTitle('Analytics')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.warn);
}

export function embedRespect(date, text) {
  return new EmbedBuilder()
    .setTitle(`Respect — ${date}`)
    .setDescription(truncate(text))
    .setColor(COLORS.respect);
}

export function embedHelp(mode, dashUrl) {
  const commands = [
    '**/dashboard** — live overview (hits, online, top hitters, no-hit list)',
    '**/live** — respect, hits, losses, online counts',
    '**/today** — today’s hits & top hitters (`window` option)',
    '**/hits** — attack log summary + report link',
    '**/inactive** — members with 0 hits',
    '**/leaderboard** — top earners by respect',
    '**/online** — who’s online for chains',
    '**/chain** — copy-paste chain ping text',
    '**/member** — one member’s stats (`name`)',
    '**/perks** — next faction upgrade progress',
    '**/respect** — pick a historical Torn day',
    '**/day** — pick a day for full breakdown',
    '**/analytics** — underperformers for a day',
    '**/compare** — compare two dates (`date_a`, `date_b`)',
    '**/history** — last N days trend (`days`)',
    '**/alltime** — cumulative member totals',
    '**/dates** — list stored stat dates',
    '**/help** — this message',
  ];
  const lines = [
    '**Faction tracker bot**',
    `Data: \`${mode}\``,
    dashUrl ? `Web: ${dashUrl}` : '',
    '',
    '**Commands**',
    commands.join('\n'),
    '',
    '_Historical commands use stored `data/YYYY-MM-DD.json` (daily fetch). Live commands use Torn API._',
  ].filter(Boolean);
  return new EmbedBuilder()
    .setTitle('Bot help')
    .setDescription(truncate(lines.join('\n')))
    .setColor(COLORS.neutral);
}
