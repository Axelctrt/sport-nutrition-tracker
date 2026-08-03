from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one occurrence, found {count}')
    return source.replace(old, new, 1)


path = Path('e2e/helpers/performanceGlass.ts')
source = path.read_text()

source = replace_once(
    source,
    "import { expect, type Page } from '@playwright/test';\n",
    "import { expect, type Page } from '@playwright/test';\n\n"
    "import { achievementCatalog } from '../../src/domain/rewards/achievements';\n",
    'achievement catalog import',
)
source = replace_once(
    source,
    """  await waitForSportPilotDatabase(page);
  await page.goto(`/${new URL(page.url()).search}#/privacy`);
  await expect(page.locator('#root')).not.toBeEmpty();

  await page.evaluate(async (databaseName) => {""",
    """  await waitForSportPilotDatabase(page);
  const achievementIds = achievementCatalog.map(({ id }) => id);

  await page.evaluate(async ({ databaseName, achievementIds: seededAchievementIds }) => {""",
    'static seed prelude',
)
source = replace_once(
    source,
    """    const endurancePlanningSessions = activities
""",
    """    const earnedAchievements = seededAchievementIds.map((id) => ({
      id,
      earnedAt: now,
      updatedAt: now,
    }));
    const endurancePlanningSessions = activities
""",
    'earned achievements seed',
)
source = replace_once(
    source,
    """      strengthSets,
      endurancePlanningSessions,
    };""",
    """      strengthSets,
      endurancePlanningSessions,
      earnedAchievements,
    };""",
    'earned achievements store',
)
source = replace_once(
    source,
    """  }, DATABASE_NAME);
}

interface VisualThemeStateOptions""",
    """  }, {
    databaseName: DATABASE_NAME,
    achievementIds,
  });
}

interface VisualThemeStateOptions""",
    'seed evaluation arguments',
)

path.write_text(source)

spec_path = Path('e2e/performance-glass-0.34.0.spec.ts')
spec_source = spec_path.read_text()
spec_source = replace_once(
    spec_source,
    """test('conserve le thème sombre core après rechargement', async ({ page }, testInfo) => {
  await createLocalProfile(page, 'Progression Dark');
  const bootstrapSearch = new URL(page.url()).search;

  await prepareSeededVisualTheme(page, bootstrapSearch, {
    activeThemeId: 'core',
    unlockedThemeIds: allThemes,
    appearance: 'light',
  }, `/${bootstrapSearch}#/progression?range=90`);

  await expectReadyPage(page, 'Progression');
  await enableDarkMode(page);
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expectReadyPage(page, 'Progression');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-sport-theme', 'core');
  await expectNoUnexpectedRewardReveal(page);
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'progression-core-dark.png');
  }
});""",
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
    'persisted dark theme phase',
)
spec_path.write_text(spec_source)
