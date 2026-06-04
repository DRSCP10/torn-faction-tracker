import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  EmbedBuilder,
} from 'discord.js';
import { formatSummaryText } from '../lib/stats.js';
import { getDates, getDay } from '../lib/data.js';

const token = process.env.DISCORD_BOT_TOKEN;
const clientId = process.env.DISCORD_CLIENT_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token || !clientId) {
  console.error('Set DISCORD_BOT_TOKEN and DISCORD_CLIENT_ID');
  process.exit(1);
}

let botConfigCache = null;
let botConfigCacheAt = 0;
const BOT_CONFIG_TTL_MS = 60_000;

async function resolveBotConfig() {
  const now = Date.now();
  if (botConfigCache && now - botConfigCacheAt < BOT_CONFIG_TTL_MS) {
    return botConfigCache;
  }
  const { getAppUrl, getBotApiSecret } = await import('../lib/settings.js');
  botConfigCache = {
    appUrl: await getAppUrl(),
    botSecret: await getBotApiSecret(),
  };
  botConfigCacheAt = now;
  return botConfigCache;
}

async function fetchSummaryRemote(date) {
  const { appUrl, botSecret } = await resolveBotConfig();
  if (!appUrl) return null;
  const url = `${appUrl}/api/summary?date=${date}`;
  const headers = botSecret ? { 'x-bot-secret': botSecret } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  const json = await res.json();
  return json.text;
}

async function fetchOnlineRemote() {
  const { appUrl, botSecret } = await resolveBotConfig();
  if (!appUrl) return null;
  const url = `${appUrl}/api/online`;
  const headers = botSecret ? { 'x-bot-secret': botSecret } : {};
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  return res.json();
}

async function summaryForDate(date) {
  const remote = await fetchSummaryRemote(date);
  if (remote) return remote;

  const day = await getDay(date);
  if (!day) return null;
  return formatSummaryText(day);
}

const commands = [
  new SlashCommandBuilder()
    .setName('respect')
    .setDescription('Faction respect stats — pick a Torn day')
    .toJSON(),
  new SlashCommandBuilder()
    .setName('online')
    .setDescription('Who is online now for chains')
    .toJSON(),
];

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(token);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commands,
    });
    console.log('Registered guild commands');
  } else {
    await rest.put(Routes.applicationCommands(clientId), { body: commands });
    console.log('Registered global commands');
  }
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Discord bot logged in as ${client.user.tag}`);
});

async function showDatePicker(interaction, customId, title) {
  const dates = await getDates();
  if (dates.length === 0) {
    await interaction.reply({
      content: 'No stats data found yet. Run the daily fetch first.',
      ephemeral: true,
    });
    return;
  }

  const recent = dates.slice(-25).reverse();
  const row = new ActionRowBuilder().addComponents(
    new StringSelectMenuBuilder()
      .setCustomId(customId)
      .setPlaceholder('Choose a Torn day')
      .addOptions(
        recent.map((d) => ({
          label: d,
          value: d,
          description: `Stats for ${d}`,
        }))
      )
  );

  await interaction.reply({
    content: title,
    components: [row],
    ephemeral: true,
  });
}

client.on('interactionCreate', async (interaction) => {
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === 'respect') {
      await showDatePicker(
        interaction,
        'respect-date',
        '📅 **Respect bot** — choose a Torn day (12:00–11:59 UTC):'
      );
      return;
    }

    if (interaction.commandName === 'online') {
      await interaction.deferReply();
      try {
        let data = await fetchOnlineRemote();
        if (!data && process.env.TORN_API_KEY) {
          const { getLiveFaction, formatOnlineList } = await import('../lib/torn.js');
          const live = await getLiveFaction();
          const chainReady = formatOnlineList(live.members);
          data = {
            name: live.name,
            tornDate: live.tornDate,
            chainReady,
            messageTemplate: `Chain up! ${chainReady
              .filter((m) => m.status === 'Online')
              .map((m) => m.name)
              .join(', ')} online`,
          };
        }
        if (!data) {
          await interaction.editReply(
            'Could not fetch online list. Set APP_URL + BOT_API_SECRET (admin or env) or TORN_API_KEY on bot host.'
          );
          return;
        }
        const lines = [
          `**${data.name}** · Torn day ${data.tornDate}`,
          '',
          `**Online (${data.online?.length ?? 0}):** ${(data.online || []).map((m) => m.name).join(', ') || '—'}`,
          `**Idle (${data.idle?.length ?? 0}):** ${(data.idle || []).map((m) => m.name).join(', ') || '—'}`,
          '',
          data.messageTemplate || data.copyText,
        ];
        const embed = new EmbedBuilder()
          .setTitle('Chain — who\'s around')
          .setDescription(lines.join('\n').slice(0, 4000))
          .setColor(0x22c55e);
        await interaction.editReply({ embeds: [embed] });
      } catch (e) {
        await interaction.editReply(`Error: ${e.message}`);
      }
      return;
    }
  }

  if (
    interaction.isStringSelectMenu() &&
    interaction.customId === 'respect-date'
  ) {
    const date = interaction.values[0];
    await interaction.deferReply();

    const text = await summaryForDate(date);
    if (!text) {
      await interaction.editReply(`No data for **${date}**.`);
      return;
    }

    const embed = new EmbedBuilder()
      .setTitle(`Respect — ${date}`)
      .setDescription(text.slice(0, 4000))
      .setColor(0xe84040);

    await interaction.editReply({ embeds: [embed] });
  }
});

await registerCommands();
client.login(token);
