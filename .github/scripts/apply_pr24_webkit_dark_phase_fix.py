from pathlib import Path

path = Path('e2e/performance-glass-0.34.0.spec.ts')
source = path.read_text()
old = """test('charge le thème sombre core depuis les préférences persistées', async ({
  page,
}, testInfo) => {
  await createLocalProfile(page, 'Progression Dark');
  const bootstrapSearch = new URL(page.url()).search;

  await prepareSeededVisualTheme(page, bootstrapSearch, {
    activeThemeId: 'core',
    unlockedThemeIds: allThemes,
    appearance: 'dark',
  }, `/${bootstrapSearch}#/progression?range=90`);

  await expectReadyPage(page, 'Progression');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-sport-theme', 'core');
  await expectNoUnexpectedRewardReveal(page);
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'progression-core-dark.png');
  }
});"""
new = """test('active le thème sombre core via le contrôle accessible', async ({
  page,
}, testInfo) => {
  await createLocalProfile(page, 'Progression Dark');
  const bootstrapSearch = new URL(page.url()).search;

  await prepareSeededVisualTheme(page, bootstrapSearch, {
    activeThemeId: 'core',
    unlockedThemeIds: allThemes,
    appearance: 'light',
  }, `/${bootstrapSearch}#/progression?range=90`);

  await expectReadyPage(page, 'Progression');
  await enableDarkMode(page);
  await expect(page.locator('html')).toHaveAttribute('data-sport-theme', 'core');
  await expectNoUnexpectedRewardReveal(page);
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'progression-core-dark.png');
  }
});"""
count = source.count(old)
if count != 1:
    raise SystemExit(f'expected one dark phase block, found {count}')
path.write_text(source.replace(old, new, 1))
