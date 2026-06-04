import { REST, Routes } from 'discord.js';
import { commandDefinitions } from './commands/definitions.js';
import { getDiscordConfig } from './config.js';

export async function registerCommands() {
  const { token, clientId, guildId } = getDiscordConfig();
  const rest = new REST({ version: '10' }).setToken(token);
  if (guildId) {
    await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
      body: commandDefinitions,
    });
    console.log(`Registered ${commandDefinitions.length} guild slash commands`);
  } else {
    await rest.put(Routes.applicationCommands(clientId), {
      body: commandDefinitions,
    });
    console.log(`Registered ${commandDefinitions.length} global slash commands (may take up to 1h)`);
  }
}
