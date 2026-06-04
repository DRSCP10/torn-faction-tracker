/** Client-side TCT formatting (Torn City Time = UTC/GMT). */
(function () {
  const TCT_LABEL = 'TCT';
  const TCT_TIMEZONE = 'UTC';

  function formatTctDateTime(date) {
    const formatted = date.toLocaleString('en-GB', {
      timeZone: TCT_TIMEZONE,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return `${formatted} ${TCT_LABEL}`;
  }

  function formatTctTime(date) {
    const formatted = date.toLocaleTimeString('en-GB', {
      timeZone: TCT_TIMEZONE,
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
    return `${formatted} ${TCT_LABEL}`;
  }

  window.TornTime = {
    TCT_LABEL,
    TCT_TIMEZONE,
    getTornDayWindowLabel: () => `12:00–11:59 ${TCT_LABEL}`,
    getCalendarDayWindowLabel: () => `00:00–23:59 ${TCT_LABEL}`,
    formatTctDateTime,
    formatTctTime,
  };
})();
