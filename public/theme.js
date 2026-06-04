(function () {
  const THEME_KEY = 'faction-theme';

  function getTheme() {
    return document.documentElement.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  }

  function applyTheme(theme) {
    const next = theme === 'light' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem(THEME_KEY, next);
    const btn = document.getElementById('themeToggle');
    if (btn) {
      btn.textContent = next === 'light' ? '☾' : '☀';
      btn.title = next === 'light' ? 'Switch to dark mode' : 'Switch to light mode';
      btn.setAttribute('aria-label', btn.title);
    }
    return next;
  }

  function toggleTheme() {
    return applyTheme(getTheme() === 'light' ? 'dark' : 'light');
  }

  function initTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    applyTheme(saved === 'light' ? 'light' : 'dark');
  }

  function chartThemeOptions() {
    const s = getComputedStyle(document.documentElement);
    const v = (name) => s.getPropertyValue(name).trim();
    return {
      grid: v('--chart-grid'),
      tick: v('--chart-tick'),
      tooltipBg: v('--chart-tooltip-bg'),
      tooltipBorder: v('--chart-tooltip-border'),
      tooltipTitle: v('--chart-tooltip-title'),
      tooltipBody: v('--chart-tooltip-body'),
    };
  }

  const saved = localStorage.getItem(THEME_KEY);
  document.documentElement.setAttribute('data-theme', saved === 'light' ? 'light' : 'dark');

  window.FactionTheme = {
    getTheme,
    applyTheme,
    toggleTheme,
    initTheme,
    chartThemeOptions,
  };
})();
