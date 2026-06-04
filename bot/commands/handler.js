import {
  ActionRowBuilder,
  StringSelectMenuBuilder,
} from 'discord.js';
import * as ds from '../data-source.js';
import * as emb from '../embeds.js';
import { getDashboardUrl } from '../config.js';
import { defer, parseWindowOption, replyError } from '../util.js';

async function requireData(interaction) {
  if (ds.getDataMode() === 'none') {
    await replyError(
      interaction,
      'Not configured. On Raspberry Pi set `TORN_API_KEY` in `.env`, or set `APP_URL` + `BOT_API_SECRET` for remote mode. See `bot/README.md`.'
    );
    return false;
  }
  return true;
}

function windowLabel(data) {
  return data?.dayWindow || 'Today (TCT)';
}

function findMember(members, query) {
  const q = String(query || '').trim().toLowerCase();
  if (!q) return null;
  const roster = members.filter((m) => !String(m.id).startsWith('stealth:'));
  const exact = roster.find((m) => m.name.toLowerCase() === q);
  if (exact) return exact;
  const partial = roster.filter((m) => m.name.toLowerCase().includes(q));
  if (partial.length === 1) return partial[0];
  return null;
}

async function showDatePicker(interaction, customId, title) {
  const result = await ds.getDates();
  if (!result.ok) {
    await replyError(interaction, result.error);
    return;
  }
  const dates = result.data.dates || [];
  if (!dates.length) {
    await interaction.reply({
      content: 'No stored stats yet. Run `npm run fetch` on the Pi or wait for the daily GitHub Action.',
      ephemeral: true,
    });
    return;
  }
  const recent = dates.slice(-25).reverse();
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Choose a date (Torn day snapshot)')
      .addOptions(
        recent.map((d) => ({
          label: d,
          value: d,
          description: `Stored stats ${d}`,
        }))
      )
  );
  await interaction.reply({ content: title, components: [row], ephemeral: true });
}

export async function handleInteraction(interaction) {
  if (interaction.isAutocomplete()) {
    const focused = interaction.options.getFocused(true);
    if (['date_a', 'date_b'].includes(focused.name)) {
      const result = await ds.getDates();
      const dates = result.ok ? result.data.dates || [] : [];
      const q = focused.value.toLowerCase();
      const filtered = dates
        .filter((d) => d.includes(q))
        .slice(-25)
        .map((d) => ({ name: d, value: d }));
      await interaction.respond(filtered);
    }
    return;
  }

  if (interaction.isStringSelectMenu()) {
    const date = interaction.values[0];
    await defer(interaction);
    if (interaction.customId === 'respect-date') {
      const result = await ds.getSummary(date);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({
        embeds: [emb.embedRespect(date, result.data.text)],
      });
      return;
    }
    if (interaction.customId === 'day-pick') {
      const result = await ds.getDay(date);
      if (!result.ok) return replyError(interaction, result.error);
      const day = result.data;
      const top = (day.members || [])
        .sort((a, b) => b.respect - a.respect)
        .slice(0, 10)
        .map(
          (m, i) =>
            `${i + 1}. **${m.name}** — ${Number(m.respect).toFixed(2)}r · ${m.hits}h`
        )
        .join('\n');
      const text = [
        `**${date}** · ${Number(day.meta?.totalRespect || 0).toFixed(2)} total respect`,
        `Hits: **${day.meta?.totalHits ?? '—'}** · Losses: **${day.meta?.totalLosses ?? '—'}**`,
        '',
        '**Top members**',
        top || '_None_',
      ].join('\n');
      await interaction.editReply({
        embeds: [
          emb.embedRespect(date, text).setTitle(`Day — ${date}`).setColor(0x3b82f6),
        ],
      });
      return;
    }
    if (interaction.customId === 'analytics-pick') {
      const result = await ds.getDay(date);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({
        embeds: [emb.embedAnalytics(result.data)],
      });
      return;
    }
    return;
  }

  if (!interaction.isChatInputCommand()) return;
  if (!(await requireData(interaction))) return;

  const { commandName } = interaction;

  if (commandName === 'help') {
    await interaction.reply({
      embeds: [
        emb.embedHelp(ds.describeDataMode(), getDashboardUrl()),
      ],
    });
    return;
  }

  if (['respect', 'day', 'analytics'].includes(commandName)) {
    const titles = {
      respect: '📅 **Respect** — choose a stored Torn day:',
      day: '📅 **Day stats** — choose a date:',
      analytics: '📅 **Analytics** — choose a date:',
    };
    const ids = {
      respect: 'respect-date',
      day: 'day-pick',
      analytics: 'analytics-pick',
    };
    await showDatePicker(interaction, ids[commandName], titles[commandName]);
    return;
  }

  await defer(interaction);

  try {
    if (commandName === 'dashboard') {
      const mode = parseWindowOption(interaction);
      const result = await ds.getTodaySummary(mode);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({ embeds: [emb.embedDashboard(result.data)] });
      return;
    }

    if (commandName === 'live') {
      const mode = parseWindowOption(interaction);
      const liveResult = await ds.getLiveStats(mode);
      if (!liveResult.ok) return replyError(interaction, liveResult.error);
      await interaction.editReply({ embeds: [emb.embedLive(liveResult.data)] });
      return;
    }

    if (commandName === 'today') {
      const mode = parseWindowOption(interaction);
      const result = await ds.getTodaySummary(mode);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({ embeds: [emb.embedToday(result.data)] });
      return;
    }

    if (commandName === 'hits') {
      const mode = parseWindowOption(interaction);
      const result = await ds.getHitsReport(mode);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({ embeds: [emb.embedHitsSummary(result.data)] });
      return;
    }

    if (commandName === 'inactive') {
      const mode = parseWindowOption(interaction);
      const result = await ds.getTodaySummary(mode);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({
        embeds: [
          emb.embedInactive(result.data.inactiveHitters, windowLabel(result.data)),
        ],
      });
      return;
    }

    if (commandName === 'leaderboard') {
      const mode = parseWindowOption(interaction);
      const limit = interaction.options.getInteger('limit') || 10;
      const result = await ds.getLiveStats(mode);
      if (!result.ok) return replyError(interaction, result.error);
      const roster = result.data.members.filter(
        (m) => !String(m.id).startsWith('stealth:')
      );
      const top = [...roster]
        .filter((m) => m.respect > 0)
        .sort((a, b) => b.respect - a.respect)
        .slice(0, limit);
      await interaction.editReply({
        embeds: [
          emb.embedLeaderboard(top, 'Leaderboard', windowLabel(result.data)),
        ],
      });
      return;
    }

    if (commandName === 'online') {
      const result = await ds.getOnline();
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({ embeds: [emb.embedOnline(result.data)] });
      return;
    }

    if (commandName === 'chain') {
      const result = await ds.getOnline();
      if (!result.ok) return replyError(interaction, result.error);
      const text = result.data.messageTemplate || result.data.copyText || '—';
      await interaction.editReply({
        content: `**Chain ping**\n\`\`\`\n${text}\n\`\`\``,
      });
      return;
    }

    if (commandName === 'member') {
      const mode = parseWindowOption(interaction);
      const name = interaction.options.getString('name');
      const result = await ds.getLiveStats(mode);
      if (!result.ok) return replyError(interaction, result.error);
      const member = findMember(result.data.members, name);
      if (!member) {
        await interaction.editReply({
          content: `No unique match for **${name}**. Try a more specific name.`,
        });
        return;
      }
      await interaction.editReply({
        embeds: [emb.embedMember(member, windowLabel(result.data))],
      });
      return;
    }

    if (commandName === 'perks') {
      const result = await ds.getLiveStats('calendar');
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({ embeds: [emb.embedPerks(result.data)] });
      return;
    }

    if (commandName === 'compare') {
      const dateA = interaction.options.getString('date_a');
      const dateB = interaction.options.getString('date_b');
      const result = await ds.getCompare(dateA, dateB);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({ embeds: [emb.embedCompare(result.data)] });
      return;
    }

    if (commandName === 'history') {
      const days = interaction.options.getInteger('days') || 14;
      const result = await ds.getHistory(days);
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({
        embeds: [emb.embedHistory(result.data.days || [])],
      });
      return;
    }

    if (commandName === 'alltime') {
      const result = await ds.getAlltime();
      if (!result.ok) return replyError(interaction, result.error);
      await interaction.editReply({ embeds: [emb.embedAlltime(result.data)] });
      return;
    }

    if (commandName === 'dates') {
      const result = await ds.getDates();
      if (!result.ok) return replyError(interaction, result.error);
      const dates = result.data.dates || [];
      const text = dates.length
        ? dates.slice(-40).join('\n')
        : '_No dates — run daily fetch_';
      await interaction.editReply({
        content: `**Stored dates (${dates.length})**\n\`\`\`\n${text}\n\`\`\``,
      });
      return;
    }

    await replyError(interaction, `Unknown command: ${commandName}`);
  } catch (e) {
    await replyError(interaction, e.message || 'Command failed');
  }
}
