import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectEssentialContentVisible,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

const primaryRoutes = ['/', '/food', '/activities', '/progression'] as const;

test('conserve les contenus essentiels sur la matrice responsive', async ({ page }) => {
  await createLocalProfile(page, 'Responsive');

  for (const route of primaryRoutes) {
    await page.goto(`/#${route}`);
    await expectNoCriticalHorizontalOverflow(page);
    await expectEssentialContentVisible(page);
  }

  const navigation = page.getByRole('navigation', {
    name: (page.viewportSize()?.width ?? 0) >= 1024
      ? 'Navigation principale'
      : 'Navigation mobile',
  });
  await expect(navigation.getByRole('link')).toHaveCount(4);
  await expect(navigation.getByRole('link', { name: 'Progression' })).toBeVisible();
});

test('reste utilisable avec un texte système agrandi', async ({ page }) => {
  await createLocalProfile(page, 'Texte agrandi');
  await page.addStyleTag({
    content: `
      @media (max-width: 63.999rem) {
        html { font-size: 125% !important; }
      }
    `,
  });

  await page.goto('/#/');
  await expectNoCriticalHorizontalOverflow(page);
  await expectEssentialContentVisible(page);
  await expect(page.getByRole('button', { name: 'Ajouter un repas' })).toBeVisible();
});

test('garde le statut et le switch IA séparés sur petit écran', async ({ page }) => {
  await createLocalProfile(page, 'Photo responsive');
  await page.goto('/#/food/photo-estimate?date=2026-07-28&slot=lunch');

  const label = page.getByText('Analyse IA', { exact: true });
  const status = page.getByText('Désactivée', { exact: true });
  const toggle = page.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' });
  await expect(label).toBeVisible();
  await expect(status).toBeVisible();
  await expect(toggle).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  const statusBox = await status.boundingBox();
  const toggleBox = await toggle.boundingBox();
  expect(statusBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(statusBox!.x + statusBox!.width).toBeLessThanOrEqual(toggleBox!.x);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Activée', { exact: true })).toBeVisible();
});
