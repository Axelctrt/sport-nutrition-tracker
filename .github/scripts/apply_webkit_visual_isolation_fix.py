from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one occurrence, found {count}')
    return source.replace(old, new, 1)


spec_path = Path('e2e/performance-glass-0.34.0.spec.ts')
spec = spec_path.read_text()

spec = replace_once(
    spec,
    "];\n\nasync function capture(",
    "];\n\nfunction isolatedVisualUrl(\n  bootstrapSearch: string,\n  parameter: string,\n  value: string,\n  hashPath: string,\n): string {\n  const query = new URLSearchParams(bootstrapSearch);\n  query.set(parameter, value);\n  return `/?${query.toString()}#${hashPath}`;\n}\n\nasync function capture(",
    'visual URL helper',
)
spec = replace_once(
    spec,
    """async function prepareVisualTheme(
  page: Page,
  options: Parameters<typeof setVisualThemeState>[1],
): Promise<void> {
  await page.goto('/visual-lab.html', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).not.toBeEmpty();
  await setVisualThemeState(page, options);
}
""",
    """async function replaceVisualApplicationPage(
  page: Page,
  bootstrapSearch: string,
  setup: (setupPage: Page) => Promise<void>,
  targetUrl: string,
): Promise<Page> {
  const context = page.context();
  await page.close();

  const setupPage = await context.newPage();
  try {
    await setupPage.goto(`/visual-lab.html${bootstrapSearch}`, {
      waitUntil: 'domcontentloaded',
    });
    await expect(setupPage.locator('#root')).not.toBeEmpty();
    await setup(setupPage);
  } finally {
    await setupPage.close();
  }

  const applicationPage = await context.newPage();
  await applicationPage.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await expect(applicationPage.locator('#root')).not.toBeEmpty();
  return applicationPage;
}

async function prepareVisualTheme(
  page: Page,
  bootstrapSearch: string,
  options: Parameters<typeof setVisualThemeState>[1],
  targetUrl = page.url(),
): Promise<Page> {
  return replaceVisualApplicationPage(
    page,
    bootstrapSearch,
    async (setupPage) => setVisualThemeState(setupPage, options),
    targetUrl,
  );
}

async function seedVisualData(
  page: Page,
  bootstrapSearch: string,
): Promise<Page> {
  return replaceVisualApplicationPage(
    page,
    bootstrapSearch,
    seedPerformanceGlassData,
    page.url(),
  );
}
""",
    'fresh application page helpers',
)
spec = replace_once(
    spec,
    """async function openReadyPage(
  page: Page,
  path: string,
  heading: string,
): Promise<void> {""",
    """async function openReadyPage(
  page: Page,
  bootstrapSearch: string,
  path: string,
  heading: string,
): Promise<void> {""",
    'openReadyPage signature',
)
spec = replace_once(
    spec,
    """      await page.goto(`/?visualQa=${Date.now()}-${attempt}#${path}`, {
        waitUntil: 'domcontentloaded',
      });""",
    """      if (attempt === 1) {
        await page.goto(`/${bootstrapSearch}#${path}`, {
          waitUntil: 'domcontentloaded',
        });
      } else {
        await page.reload({ waitUntil: 'domcontentloaded' });
      }""",
    'openReadyPage navigation',
)
spec = replace_once(
    spec,
    "  await createLocalProfile(page, 'Performance Glass');\n",
    "  await createLocalProfile(page, 'Performance Glass');\n  const bootstrapSearch = new URL(page.url()).search;\n",
    'performance bootstrap search',
)
spec = replace_once(
    spec,
    "  await createLocalProfile(page, 'Reveal');\n",
    "  await createLocalProfile(page, 'Reveal');\n  const bootstrapSearch = new URL(page.url()).search;\n",
    'reveal bootstrap search',
)
spec = spec.replace(
    'await prepareVisualTheme(page, {',
    'page = await prepareVisualTheme(page, bootstrapSearch, {',
)
spec = spec.replace(
    'openReadyPage(page, ',
    'openReadyPage(page, bootstrapSearch, ',
)
spec = replace_once(
    spec,
    '  await seedPerformanceGlassData(page);',
    '  page = await seedVisualData(page, bootstrapSearch);',
    'visual data seed call',
)
spec = replace_once(
    spec,
    "      pendingRevealThemeId: themeId,\n    });\n    await page.goto(`/?visualReveal=${themeId}#/`);",
    "      pendingRevealThemeId: themeId,\n    }, isolatedVisualUrl(bootstrapSearch, 'visualReveal', themeId, '/'));",
    'theme reveal page replacement',
)
spec = replace_once(
    spec,
    "    pendingRevealThemeId: 'aurora',\n  });\n  await page.goto('/?visualReveal=aurora-reduced#/');",
    "    pendingRevealThemeId: 'aurora',\n  }, isolatedVisualUrl(bootstrapSearch, 'visualReveal', 'aurora-reduced', '/'));",
    'reduced reveal page replacement',
)
spec_path.write_text(spec)

helper_path = Path('e2e/helpers/performanceGlass.ts')
helper = helper_path.read_text()
helper = replace_once(
    helper,
    "  await page.goto('/#/privacy');",
    "  await page.goto(`/${new URL(page.url()).search}#/privacy`);",
    'seed navigation',
)
helper_path.write_text(helper)
