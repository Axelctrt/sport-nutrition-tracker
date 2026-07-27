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

  const navigation = page.getByRole('navigation', { name: 'Navigation mobile' });
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
