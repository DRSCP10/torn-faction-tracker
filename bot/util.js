export const WINDOW_CHOICES = [
  { name: 'Calendar day (TCT)', value: 'calendar' },
  { name: 'Since war start', value: 'war' },
];

export function parseWindowOption(interaction) {
  return interaction.options.getString('window') || 'calendar';
}

export function truncate(text, max = 4000) {
  const s = String(text || '');
  return s.length <= max ? s : `${s.slice(0, max - 3)}...`;
}

export function fmtNum(n, digits = 2) {
  return Number(n || 0).toFixed(digits);
}

export function reportUrl(data) {
  const link = data?.hitsReportUrl || data?.hitsReportPath;
  if (!link) return null;
  return link.startsWith('http') ? link : null;
}

export async function defer(interaction) {
  if (!interaction.deferred && !interaction.replied) {
    await interaction.deferReply();
  }
}

export async function replyError(interaction, message) {
  const payload = { content: `❌ ${message}` };
  if (interaction.deferred || interaction.replied) {
    await interaction.editReply(payload);
  } else {
    await interaction.reply({ ...payload, ephemeral: true });
  }
}
