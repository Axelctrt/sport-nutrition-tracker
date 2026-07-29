import { expect, test, type Page } from '@playwright/test';

async function expectOnboardingFitsViewport(page: Page): Promise<void> {
  await page.evaluate(() => window.scrollTo(0, 400));
  await page.waitForTimeout(50);

  const metrics = await page.evaluate(() => {
    const main = document.querySelector('main');
    const actionRegion = document.querySelector('[aria-label="Actions de la page"]');
    const mainRect = main?.getBoundingClientRect();
    const actionRect = actionRegion?.getBoundingClientRect();
    return {
      documentOverflow: document.documentElement.scrollHeight - window.innerHeight,
      bodyOverflow: document.body.scrollHeight - window.innerHeight,
      scrollY: window.scrollY,
      mainTop: mainRect?.top ?? -1,
      mainBottom: mainRect?.bottom ?? -1,
      actionBottom: actionRect?.bottom ?? 0,
      viewportHeight: window.innerHeight,
      rootOverflow: getComputedStyle(document.documentElement).overflow,
      bodyOverflowStyle: getComputedStyle(document.body).overflow,
    };
  });

  expect(metrics.documentOverflow).toBeLessThanOrEqual(1);
  expect(metrics.bodyOverflow).toBeLessThanOrEqual(1);
  expect(metrics.scrollY).toBe(0);
  expect(metrics.rootOverflow).toBe('hidden');
  expect(metrics.bodyOverflowStyle).toBe('hidden');
  expect(metrics.mainTop).toBeGreaterThanOrEqual(0);
  expect(metrics.mainBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  if (metrics.actionBottom > 0) {
    expect(metrics.actionBottom).toBeLessThanOrEqual(metrics.viewportHeight + 1);
  }
}

test('maintient chaque étape locale dans la hauteur de l’iPhone 15', async ({ page, isMobile }) => {
  test.skip(!isMobile, 'Ce contrôle cible le viewport mobile configuré pour l’iPhone 15.');

  await page.goto('/#/onboarding', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Comment utiliser SportPilot ?' })).toBeVisible();
  await expect(page.getByLabel(/Adresse e-mail/)).toHaveCount(0);
  await expectOnboardingFitsViewport(page);

  await page.getByRole('button', { name: 'Choisir le mode local' }).click();
  await expect(page.getByRole('heading', { name: 'Comment vous appeler ?' })).toBeVisible();
  await expectOnboardingFitsViewport(page);
  await page.getByLabel(/Nom affiché/).fill('Test');

  const headings = [
    'Sexe utilisé pour les calculs',
    'Quelle est votre date de naissance ?',
    'Quelle est votre taille ?',
    'Quel est votre poids actuel ?',
    'Quel est votre objectif ?',
    'Quel est votre niveau d’activité ?',
    'Quel objectif de pas quotidien ?',
  ];

  for (const heading of headings) {
    await page.getByRole('button', { name: 'Continuer' }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
    await expectOnboardingFitsViewport(page);
  }

  await page.getByRole('button', { name: 'Continuer' }).click();
  const summaryHeading = page.getByRole('heading', { name: 'Votre profil est prêt' });
  await expect(summaryHeading).toBeVisible();

  const summaryPage = page.locator('main[data-onboarding-page-scroll="summary"]');
  const summaryContent = page.locator('[data-onboarding-summary-content]');
  await expect(summaryPage).toHaveCSS('overflow-y', 'auto');
  await expect(summaryContent).not.toHaveCSS('overflow-y', 'auto');

  const headingTopBeforeScroll = await summaryHeading.evaluate((element) => element.getBoundingClientRect().top);
  const scrollTop = await summaryPage.evaluate((element) => {
    element.scrollTop = element.scrollHeight;
    return element.scrollTop;
  });
  await expect.poll(async () => summaryPage.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  const headingTopAfterScroll = await summaryHeading.evaluate((element) => element.getBoundingClientRect().top);

  expect(scrollTop).toBeGreaterThan(0);
  expect(headingTopAfterScroll).toBeLessThan(headingTopBeforeScroll);
  await expect(page.getByRole('button', { name: 'Modifier l’objectif', exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Commencer' })).toBeVisible();
});

test('affiche les rouleaux sans saisie numérique manuelle', async ({ page }) => {
  await page.goto('/#/onboarding', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Choisir le mode local' }).click();

  await page.getByRole('button', { name: 'Continuer' }).click();
  await page.getByRole('button', { name: 'Continuer' }).click();
  await expect(page.getByRole('heading', { name: 'Quelle est votre date de naissance ?' })).toBeVisible();

  await expect(page.getByRole('radio', { name: 'Date de naissance' })).toBeChecked();
  await expect(page.getByRole('listbox', { name: 'JJ' })).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'MM' })).toBeVisible();
  await expect(page.getByRole('listbox', { name: 'AAAA' })).toBeVisible();

  await page.getByRole('radio', { name: 'Âge' }).click();
  await expect(page.getByRole('listbox', { name: 'Âge' })).toBeVisible();
  await expect(page.locator('input[type="date"]')).toHaveCount(0);
});
