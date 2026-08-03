from pathlib import Path


def replace_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise SystemExit(f'{label}: expected one occurrence, found {count}')
    return source.replace(old, new, 1)


path = Path('e2e/performance-glass-0.34.0.spec.ts')
source = path.read_text()

source = replace_once(
    source,
    "interface VisualApplicationPageOptions {\n",
    "type VisualBrowserName = 'chromium' | 'firefox' | 'webkit';\n\ninterface VisualApplicationPageOptions {\n",
    'browser name type',
)

source = replace_once(
    source,
    """async function prepareVisualTheme(
  page: Page,
  bootstrapSearch: string,
  options: Parameters<typeof setVisualThemeState>[1],
  targetUrl = page.url(),
  pageOptions: VisualApplicationPageOptions = {},
): Promise<Page> {
  return replaceVisualApplicationPage(
    page,
    bootstrapSearch,
    async (setupPage) => setVisualThemeState(setupPage, options),
    targetUrl,
    pageOptions,
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
    """async function prepareVisualApplicationPage(
  page: Page,
  browserName: VisualBrowserName,
  bootstrapSearch: string,
  setup: (setupPage: Page) => Promise<void>,
  targetUrl: string,
  pageOptions: VisualApplicationPageOptions = {},
): Promise<Page> {
  if (browserName === 'webkit') {
    return replaceVisualApplicationPage(
      page,
      bootstrapSearch,
      setup,
      targetUrl,
      pageOptions,
    );
  }

  await page.goto(`/visual-lab.html${bootstrapSearch}`, {
    waitUntil: 'domcontentloaded',
  });
  await expect(page.locator('#root')).not.toBeEmpty();
  await setup(page);
  if (pageOptions.reducedMotion) {
    await page.emulateMedia({ reducedMotion: pageOptions.reducedMotion });
  }
  await page.goto(targetUrl, { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#root')).not.toBeEmpty();
  return page;
}

async function prepareVisualTheme(
  page: Page,
  browserName: VisualBrowserName,
  bootstrapSearch: string,
  options: Parameters<typeof setVisualThemeState>[1],
  targetUrl = page.url(),
  pageOptions: VisualApplicationPageOptions = {},
): Promise<Page> {
  return prepareVisualApplicationPage(
    page,
    browserName,
    bootstrapSearch,
    async (setupPage) => setVisualThemeState(setupPage, options),
    targetUrl,
    pageOptions,
  );
}

async function seedVisualData(
  page: Page,
  browserName: VisualBrowserName,
  bootstrapSearch: string,
): Promise<Page> {
  return prepareVisualApplicationPage(
    page,
    browserName,
    bootstrapSearch,
    seedPerformanceGlassData,
    page.url(),
  );
}
""",
    'browser lifecycle helpers',
)

source = replace_once(
    source,
    """test('valide les thèmes, graphiques et écrans de décision avec des données contrôlées', async ({
  page,
}, testInfo) => {""",
    """test('valide les thèmes, graphiques et écrans de décision avec des données contrôlées', async ({
  browserName,
  page,
}, testInfo) => {""",
    'main visual fixture',
)
source = replace_once(
    source,
    """test('capture les reveals uniques et le mode mouvement réduit', async ({
  page,
}, testInfo) => {""",
    """test('capture les reveals uniques et le mode mouvement réduit', async ({
  browserName,
  page,
}, testInfo) => {""",
    'reveal fixture',
)

source = source.replace(
    'prepareVisualTheme(page, bootstrapSearch,',
    'prepareVisualTheme(page, browserName, bootstrapSearch,',
)
source = replace_once(
    source,
    'seedVisualData(page, bootstrapSearch)',
    'seedVisualData(page, browserName, bootstrapSearch)',
    'seed call',
)

path.write_text(source)
