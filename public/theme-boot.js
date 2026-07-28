(() => {
  try {
    const appearance = localStorage.getItem('sport-pilot.theme');
    const dark = appearance === 'dark'
      || (
        appearance !== 'light'
        && matchMedia('(prefers-color-scheme: dark)').matches
      );
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';

    const theme = localStorage.getItem('sport-pilot.active-theme');
    const themes = [
      'core',
      'neon-pulse',
      'emerald-focus',
      'aurora',
      'zenith-gold',
    ];
    document.documentElement.dataset.sportTheme = themes.includes(theme)
      ? theme
      : 'core';
  } catch {
    document.documentElement.dataset.sportTheme = 'core';
  }
})();
