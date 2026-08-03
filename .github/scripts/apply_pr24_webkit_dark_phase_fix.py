from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one occurrence, found {count}')
    return source.replace(old, new, 1)


spec_path = Path('e2e/performance-glass-0.34.0.spec.ts')
spec_source = spec_path.read_text()
spec_source = replace_once(
    spec_source,
    """test('charge le thème sombre core depuis les préférences persistées', async ({
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
});""",
    """test('active le thème sombre core via le contrôle accessible', async ({
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
});""",
    'accessible dark phase',
)
spec_path.write_text(spec_source)

helper_path = Path('e2e/helpers/performanceGlass.ts')
helper_source = helper_path.read_text()
helper_source = replace_once(
    helper_source,
    """  }, {
    databaseName: DATABASE_NAME,
    visualThemeStorageKey: VISUAL_THEME_STORAGE_KEY,
    visualThemeBootStorageKey: VISUAL_THEME_BOOT_STORAGE_KEY,
    appearanceStorageKey: APPEARANCE_STORAGE_KEY,
    activeTheme: activeThemeId,
    unlockedThemes: unlockedThemeIds,
    selectedAppearance: appearance,
    pendingTheme: pendingRevealThemeId,
  });
}""",
    """  }, {
    databaseName: DATABASE_NAME,
    visualThemeStorageKey: VISUAL_THEME_STORAGE_KEY,
    visualThemeBootStorageKey: VISUAL_THEME_BOOT_STORAGE_KEY,
    appearanceStorageKey: APPEARANCE_STORAGE_KEY,
    activeTheme: activeThemeId,
    unlockedThemes: unlockedThemeIds,
    selectedAppearance: appearance,
    pendingTheme: pendingRevealThemeId,
  });

  const persistedAppearance = await page.evaluate(async ({
    databaseName,
    appearanceStorageKey,
  }) => {
    const localAppearance = localStorage.getItem(appearanceStorageKey);
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open(databaseName);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    try {
      if (!database.objectStoreNames.contains('deviceSettings')) {
        return { localAppearance, deviceAppearance: null };
      }
      const settings = await new Promise<{ theme?: string } | undefined>((resolve, reject) => {
        const transaction = database.transaction('deviceSettings', 'readonly');
        const request = transaction.objectStore('deviceSettings').get('device-settings');
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
        transaction.onabort = () => reject(transaction.error);
      });
      return {
        localAppearance,
        deviceAppearance: settings?.theme ?? null,
      };
    } finally {
      database.close();
    }
  }, {
    databaseName: DATABASE_NAME,
    appearanceStorageKey: APPEARANCE_STORAGE_KEY,
  });

  expect(
    persistedAppearance,
    'Le thème visuel doit être persisté dans localStorage et deviceSettings avant le redémarrage applicatif.',
  ).toEqual({
    localAppearance: appearance,
    deviceAppearance: appearance,
  });
}""",
    'appearance persistence readback',
)
helper_path.write_text(helper_source)
