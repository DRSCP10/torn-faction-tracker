import { SlashCommandBuilder } from 'discord.js';
import { WINDOW_CHOICES } from '../util.js';

function windowOption() {
  return (opt) =>
    opt
      .setName('window')
      .setDescription('Calendar day (TCT) or since war start')
      .setRequired(false)
      .addChoices(...WINDOW_CHOICES);
}

export const commandDefinitions = [
  new SlashCommandBuilder()
    .setName('help')
    .setDescription('List all bot commands and setup info')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('dashboard')
    .setDescription('Dashboard overview — hits, online, top hitters, no-hit list')
    .addStringOption(windowOption())
    .toJSON(),

  new SlashCommandBuilder()
    .setName('live')
    .setDescription('Live faction stats (respect, hits, online, losses)')
    .addStringOption(windowOption())
    .toJSON(),

  new SlashCommandBuilder()
    .setName('today')
    .setDescription('Today’s hits, top hitters, stealth-on-us, report link')
    .addStringOption(windowOption())
    .toJSON(),

  new SlashCommandBuilder()
    .setName('hits')
    .setDescription('Hits report summary (results breakdown + link)')
    .addStringOption(windowOption())
    .toJSON(),

  new SlashCommandBuilder()
    .setName('inactive')
    .setDescription('Members with zero offensive hits in the window')
    .addStringOption(windowOption())
    .toJSON(),

  new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('Top members by respect earned in the window')
    .addStringOption(windowOption())
    .addIntegerOption((opt) =>
      opt
        .setName('limit')
        .setDescription('How many to show (default 10)')
        .setMinValue(3)
        .setMaxValue(25)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('online')
    .setDescription('Who is online / idle for chains')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('chain')
    .setDescription('Chain ping text to copy (online names)')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('member')
    .setDescription('Stats for one faction member today')
    .addStringOption((opt) =>
      opt.setName('name').setDescription('Member name (partial match)').setRequired(true)
    )
    .addStringOption(windowOption())
    .toJSON(),

  new SlashCommandBuilder()
    .setName('perks')
    .setDescription('Faction upgrade / perk progress bar')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('respect')
    .setDescription('Respect summary for a stored Torn day — pick date')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('day')
    .setDescription('Full stats for a stored day — pick date')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('analytics')
    .setDescription('Underperformers & top respect for a stored day')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('compare')
    .setDescription('Compare respect & hits between two stored days')
    .addStringOption((opt) =>
      opt
        .setName('date_a')
        .setDescription('First date (YYYY-MM-DD)')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .addStringOption((opt) =>
      opt
        .setName('date_b')
        .setDescription('Second date (YYYY-MM-DD)')
        .setRequired(true)
        .setAutocomplete(true)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('history')
    .setDescription('Recent daily totals (respect / hits / losses)')
    .addIntegerOption((opt) =>
      opt
        .setName('days')
        .setDescription('Number of days (default 14, max 30)')
        .setMinValue(3)
        .setMaxValue(30)
    )
    .toJSON(),

  new SlashCommandBuilder()
    .setName('alltime')
    .setDescription('All-time member totals from stored history')
    .toJSON(),

  new SlashCommandBuilder()
    .setName('dates')
    .setDescription('List available stored stat dates')
    .toJSON(),
];
