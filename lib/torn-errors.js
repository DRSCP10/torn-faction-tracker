/** Map Torn API error codes to actionable messages. */
export function formatTornError(data) {
  const code = data?.error?.code;
  const raw = data?.error?.error || 'Torn API error';

  switch (code) {
    case 2:
      return 'Invalid API key';
    case 7:
      return (
        'Faction API access required. In Torn → Account → API Keys, enable Faction ' +
        'permissions on the key used as TORN_API_KEY (attacks/basic/upgrades). ' +
        'Officers must grant Faction API Access to your position.'
      );
    case 16:
      return `API key access too low for this data: ${raw}`;
    default:
      return raw;
  }
}

export function throwIfTornError(data) {
  if (data?.error) {
    throw new Error(formatTornError(data));
  }
}
