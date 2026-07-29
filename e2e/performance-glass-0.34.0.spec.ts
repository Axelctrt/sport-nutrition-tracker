import { expect, test, type Page, type TestInfo } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
  expectPageAccessibilityBaseline,
} from './helpers/app';
import {
  seedPerformanceGlassData,
  setVisualThemeState,
  type VisualQaTheme,
} from './helpers/performanceGlass';

const allThemes: VisualQaTheme[] = [
  'core',
  'neon-pulse',
  'emerald-focus',
  'aurora',
  'zenith-gold',
];

async function capture(
  page: Page,
  testInfo: TestInfo,
  name: string,
): Promise<void> {
  await page.screenshot({
    path: testInfo.outputPath(name),
    fullPage: true,
    animations: 'disabled',
  });
}

async function openReadyPage(
  page: Page,
  path: string,
  heading: string,
): Promise<void> {
  await page.goto(`/?visualQa=${Date.now()}#${path}`);
  await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
  await expect(page.locator('[aria-label="Chargement des analyses"]')).toHaveCount(0);
  await expect(page.locator('[aria-label="Chargement de la progression"]')).toHaveCount(0);
  await expectNoCriticalHorizontalOverflow(page);
}

test('valide les thèmes, graphiques et écrans de décision avec des données contrôlées', async ({
  page,
}, testInfo) => {
  test.setTimeout(180_000);
  await createLocalProfile(page, 'Performance Glass');

  await setVisualThemeState(page, {
    activeThemeId: 'core',
    unlockedThemeIds: ['core'],
    appearance: 'light',
  });
  await openReadyPage(page, '/rewards', 'Récompenses');
  await expect(page.getByText('1 / 5', { exact: true })).toBeVisible();
  await expect(page.getByText('Verrouillé', { exact: true })).toHaveCount(4);
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'rewards-collection-locked-core-light.png');
  }

  await seedPerformanceGlassData(page);
  await setVisualThemeState(page, {
    activeThemeId: 'core',
    unlockedThemeIds: allThemes,
    appearance: 'light',
  });

  await openReadyPage(page, '/progression?range=30', 'Progression');
  await expect(page.getByText('Signal principal', { exact: true })).toBeVisible();
  await expect(page.getByText('Vue d’ensemble', { exact: true })).toBeVisible();
  await expectPageAccessibilityBaseline(page, { expectedHeading: 'Progression' });
  if (
    testInfo.project.name === 'chromium-desktop'
    || testInfo.project.name === 'chromium-small-320'
    || testInfo.project.name === 'webkit-iphone-15'
  ) {
    await capture(page, testInfo, 'progression-core-light.png');
  }
  await page.getByRole('tab', { name: '3 mois' }).click();
  await expect(page).toHaveURL(/range=90/);

  await setVisualThemeState(page, {
    activeThemeId: 'core',
    unlockedThemeIds: allThemes,
    appearance: 'dark',
  });
  await openReadyPage(page, '/progression?range=90', 'Progression');
  await expect(page.locator('html')).toHaveClass(/dark/);
  await expect(page.locator('html')).toHaveAttribute('data-sport-theme', 'core');
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'progression-core-dark.png');
  }

  await setVisualThemeState(page, {
    activeThemeId: 'aurora',
    unlockedThemeIds: allThemes,
    appearance: 'dark',
  });
  await openReadyPage(page, '/progression?range=90', 'Progression');
  await expect(page.locator('html')).toHaveAttribute('data-sport-theme', 'aurora');
  if (
    testInfo.project.name === 'chromium-desktop'
    || testInfo.project.name === 'webkit-iphone-15'
  ) {
    await capture(page, testInfo, 'progression-aurora-dark.png');
  }

  await openReadyPage(page, '/analytics?tab=overview&weeks=12', 'Analyses');
  await expect(page.getByRole('heading', { name: 'Tendance du poids' })).toBeVisible();
  await expect(page.locator('.recharts-responsive-container')).not.toHaveCount(0);
  await expectPageAccessibilityBaseline(page, { expectedHeading: 'Analyses' });
  if (
    testInfo.project.name === 'chromium-desktop'
    || testInfo.project.name === 'webkit-iphone-15'
  ) {
    await capture(page, testInfo, 'analytics-overview-aurora-dark.png');
  }

  await page.getByRole('tab', { name: 'Corps' }).click();
  await expect(page).toHaveURL(/tab=body/);
  await page.getByLabel('Période du poids').selectOption('all');
  await expect(page).toHaveURL(/bodyPeriod=all/);
  await expect(page.getByText('Voir les données du graphique').first()).toBeVisible();
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'analytics-weight.png');
  }

  await page.getByRole('tab', { name: 'Nutrition' }).click();
  await expect(page.getByRole('heading', { name: 'Calories contre cible' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Répartition des macros' })).toBeVisible();
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'analytics-calories-target.png');
  }

  await page.getByRole('tab', { name: 'Musculation' }).click();
  await expect(page.getByRole('heading', { name: '1RM estimé' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Groupes musculaires' })).toBeVisible();
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'analytics-strength.png');
  }

  await page.getByRole('tab', { name: 'Régularité' }).click();
  await expect(page.getByRole('heading', { name: 'Heatmap de continuité' })).toBeVisible();
  await expect(page.getByLabel('Continuité quotidienne sur la période')).toBeVisible();
  if (
    testInfo.project.name === 'chromium-desktop'
    || testInfo.project.name === 'chromium-small-320'
  ) {
    await capture(page, testInfo, 'analytics-heatmap.png');
  }

  await openReadyPage(page, '/rewards', 'Récompenses');
  await expect(page.getByText('5 / 5', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aurora' }).first()).toBeVisible();
  await expectPageAccessibilityBaseline(page, { expectedHeading: 'Récompenses' });
  if (
    testInfo.project.name === 'chromium-desktop'
    || testInfo.project.name === 'webkit-iphone-15'
  ) {
    await capture(page, testInfo, 'rewards-collection-unlocked-aurora-dark.png');
  }
});

test('capture les reveals uniques et le mode mouvement réduit', async ({
  page,
}, testInfo) => {
  test.skip(
    !['chromium-desktop', 'webkit-iphone-15'].includes(testInfo.project.name),
    'Captures représentatives limitées au bureau et à l’iPhone 15.',
  );
  await createLocalProfile(page, 'Reveal');

  for (const themeId of ['neon-pulse', 'aurora', 'zenith-gold'] as const) {
    await setVisualThemeState(page, {
      activeThemeId: 'core',
      unlockedThemeIds: ['core', themeId],
      appearance: 'dark',
      pendingRevealThemeId: themeId,
    });
    await page.goto(`/?visualReveal=${themeId}#/`);
    const reveal = page.locator(`[data-theme-reveal="${themeId}"]`);
    await expect(reveal).toBeVisible();
    await expect(page.locator('html')).toHaveClass(/dark/);
    await expect(reveal.getByRole('dialog')).toBeVisible();
    await expect(reveal.getByRole('button', { name: 'Essayer maintenant' })).toBeFocused();
    await expectNoCriticalHorizontalOverflow(page);

    if (
      testInfo.project.name === 'chromium-desktop'
      || themeId === 'aurora'
    ) {
      await capture(page, testInfo, `reveal-${themeId}.png`);
    }
  }

  await page.emulateMedia({ reducedMotion: 'reduce' });
  await setVisualThemeState(page, {
    activeThemeId: 'core',
    unlockedThemeIds: ['core', 'aurora'],
    appearance: 'dark',
    pendingRevealThemeId: 'aurora',
  });
  await page.goto('/?visualReveal=aurora-reduced#/');
  const reducedReveal = page.locator('[data-theme-reveal="aurora"]');
  await expect(reducedReveal).toHaveAttribute('data-reduced-motion', 'true');
  if (testInfo.project.name === 'chromium-desktop') {
    await capture(page, testInfo, 'reveal-aurora-reduced-motion.png');
  }
});

test('capture le loader multi-étapes et le bouton stateful dans le harnais visuel', async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name !== 'chromium-desktop',
    'Le harnais visuel de composants est capturé une seule fois sur desktop.',
  );
  await page.goto('/');
  await page.evaluate(() => {
    document.documentElement.classList.add('dark');
    document.documentElement.dataset.sportTheme = 'neon-pulse';
    document.body.innerHTML = `
      <main style="min-height:100vh;display:grid;place-items:center;padding:32px">
        <section class="sp-card" style="width:min(100%,420px);padding:24px">
          <p style="font-size:12px;font-weight:700;text-transform:uppercase;color:var(--sp-accent-primary)">
            Analyse photo
          </p>
          <h1 style="margin-top:6px;font-size:24px;font-weight:700;color:var(--sp-text-primary)">
            Traitement du repas
          </h1>
          <p style="margin-top:8px;font-size:14px;color:var(--sp-text-secondary)">
            Les étapes affichées correspondent au traitement réellement observable.
          </p>
          <div class="sp-multi-step-loader" data-motion-active="true"
            aria-label="Étapes de l’analyse photo" style="margin-top:20px">
            <ol style="display:grid;gap:12px">
              <li class="sp-multi-step-loader__step" data-status="complete">
                <span class="sp-multi-step-loader__icon" aria-hidden="true">✓</span>
                <span>Photo prête</span>
              </li>
              <li class="sp-multi-step-loader__step" data-status="active" aria-current="step">
                <span class="sp-multi-step-loader__icon" aria-hidden="true">◌</span>
                <span>Analyse en cours</span>
              </li>
              <li class="sp-multi-step-loader__step" data-status="pending">
                <span class="sp-multi-step-loader__icon" aria-hidden="true">○</span>
                <span>Vérification du résultat</span>
              </li>
            </ol>
          </div>
          <button class="sp-stateful-button" data-state="loading"
            aria-busy="true" style="margin-top:20px;width:100%">
            <span class="sp-stateful-button__content">
              <span aria-hidden="true">◌</span>
              <span>Analyse en cours…</span>
            </span>
          </button>
        </section>
      </main>
    `;
  });
  await expect(page.getByLabel('Étapes de l’analyse photo')).toBeVisible();
  await capture(page, testInfo, 'multi-step-loader-stateful-button.png');
});
