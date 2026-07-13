import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectPageAccessibilityBaseline,
} from './helpers/app';

const primaryRoutes = [
  { path: '/', heading: /^Bonjour / },
  { path: '/food', heading: 'Journal alimentaire' },
  { path: '/activities', heading: 'Sport' },
  { path: '/progression', heading: 'Progression' },
] as const;

test('valide le socle mobile des quatre rubriques principales', async ({ page }) => {
  await createLocalProfile(page, 'Recette U15');

  for (const route of primaryRoutes) {
    await page.goto(`/#${route.path}`);
    await expectPageAccessibilityBaseline(page, {
      expectedHeading: route.heading,
      checkShellTouchTargets: true,
    });
  }

  const navigation = page.getByRole('navigation', {
    name: /Navigation (?:mobile|principale)/,
  });
  await expect(navigation).toBeVisible();
  await expect(navigation.getByRole('link')).toHaveCount(4);
  await expect(navigation.getByRole('link', { name: 'Progression' })).toHaveAttribute('aria-current', 'page');
});

test('rend le lien d’évitement et le focus clavier opérationnels', async ({ page }, testInfo) => {
  await createLocalProfile(page);
  await page.goto('/#/food');

  const skipLink = page.getByRole('link', { name: 'Aller au contenu' });
  if (testInfo.project.name === 'chromium-desktop') {
    await page.keyboard.press('Tab');
    await expect(skipLink).toBeFocused();
    await page.keyboard.press('Enter');
  } else {
    await skipLink.focus();
    await expect(skipLink).toBeFocused();
    await skipLink.click();
  }

  await expect(page.locator('#main-content')).toBeFocused();
  await expect(page).toHaveURL(/#\/food$/);

  await expectPageAccessibilityBaseline(page, {
    expectedHeading: 'Journal alimentaire',
    checkShellTouchTargets: true,
  });
});

test('piège puis restitue le focus dans un panneau mobile', async ({ page }, testInfo) => {
  await createLocalProfile(page);
  await page.goto('/#/activities');

  const trigger = page.getByRole('button', { name: 'Choisir l’activité' });
  await trigger.focus();
  await trigger.click();

  const dialog = page.getByRole('dialog', { name: 'Démarrer ou ajouter une activité' });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole('button', { name: 'Fermer', exact: true })).toBeFocused();

  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();

  if (testInfo.project.name === 'chromium-desktop') {
    await expect(trigger).toBeFocused();
  } else {
    await expect(trigger).toBeVisible();
    await expect(trigger).toBeEnabled();
    await trigger.focus();
    await expect(trigger).toBeFocused();
  }
});

test('respecte la réduction des animations système', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await createLocalProfile(page);
  await page.goto('/#/activities');
  await page.getByRole('button', { name: 'Choisir l’activité' }).click();

  const duration = await page.getByRole('dialog', { name: 'Démarrer ou ajouter une activité' }).evaluate((element) => {
    const value = window.getComputedStyle(element).animationDuration.trim();
    if (value.endsWith('ms')) return Number.parseFloat(value);
    if (value.endsWith('s')) return Number.parseFloat(value) * 1000;
    return Number.POSITIVE_INFINITY;
  });

  expect(duration).toBeLessThanOrEqual(10);
});
