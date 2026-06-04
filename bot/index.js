import { Client, GatewayIntentBits } from 'discord.js';
import { getDiscordConfig, ensureRepoCwd, getDataMode } from './config.js';
import { describeDataMode } from './data-source.js';
import { registerCommands } from './register-commands.js';
import { handleInteraction } from './commands/handler.js';

const { token, clientId } = getDiscordConfig();

if (!token || !clientId) {
  console.error('Missing DISCORD_BOT_TOKEN or DISCORD_CLIENT_ID. See bot/.env.example');
  process.exit(1);
}

ensureRepoCwd();

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

client.once('ready', () => {
  console.log(`Logged in as ${client.user.tag}`);
  console.log(`Data mode: ${describeDataMode()}`);
});

client.on('interactionCreate', async (interaction) => {
  try {
    await handleInteraction(interaction);
  } catch (e) {
    console.error('Interaction error:', e);
    if (interaction.isRepliable()) {
      const msg = { content: `❌ ${e.message || 'Unexpected error'}`, ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.editReply(msg).catch(() => {});
      } else {
        await interaction.reply(msg).catch(() => {});
      }
    }
  }
});

await registerCommands();
await client.login(token);
