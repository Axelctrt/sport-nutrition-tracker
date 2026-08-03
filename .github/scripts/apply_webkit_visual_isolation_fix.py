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
""",
    """async function prepareVisualTheme(
  page: Page,
  bootstrapSearch: string,
  options: Parameters<typeof setVisualThemeState>[1],
): Promise<void> {
  await page.goto(`/visual-lab.html${bootstrapSearch}`, {
    waitUntil: 'domcontentloaded',
  });
""",
    'prepareVisualTheme',
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
    """      await page.goto(isolatedVisualUrl(
        bootstrapSearch,
        'visualQa',
        `${Date.now()}-${attempt}`,
        path,
      ), {
        waitUntil: 'domcontentloaded',
      });""",
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
    'prepareVisualTheme(page, {',
    'prepareVisualTheme(page, bootstrapSearch, {',
)
spec = spec.replace(
    'openReadyPage(page, ',
    'openReadyPage(page, bootstrapSearch, ',
)
spec = replace_once(
    spec,
    "    await page.goto(`/?visualReveal=${themeId}#/`);",
    "    await page.goto(isolatedVisualUrl(bootstrapSearch, 'visualReveal', themeId, '/'));",
    'theme reveal navigation',
)
spec = replace_once(
    spec,
    "  await page.goto('/?visualReveal=aurora-reduced#/');",
    "  await page.goto(isolatedVisualUrl(bootstrapSearch, 'visualReveal', 'aurora-reduced', '/'));",
    'reduced reveal navigation',
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
