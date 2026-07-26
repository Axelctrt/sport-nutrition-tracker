import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('guide le check-in quotidien sans débordement sur iPhone 15', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'webkit-iphone-15',
    'Ce parcours cible le viewport mobile WebKit de l’iPhone 15.',
  );

  await createLocalProfile(page, 'Assistant E2E');

  await expect(page.getByRole('heading', { name: 'Assistant du jour' })).toBeVisible();
  await expect(page.getByText('Cible alimentaire guidée')).toBeVisible();
  await expect(page.getByText('Pas attendus')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progression de la journée' }))
    .toHaveAttribute('aria-valuenow', '0');
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Faire le check-in' }).click();

  const dialog = page.getByRole('dialog', { name: 'Check-in du matin' });
  const saveButton = dialog.getByRole('button', { name: 'Enregistrer le check-in' });
  await expect(dialog).toBeVisible();
  await expect(saveButton).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fermer', exact: true })).toBeFocused();

  const dialogBounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: window.visualViewport?.width ?? window.innerWidth,
    };
  });
  expect(dialogBounds.left).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.right).toBeLessThanOrEqual(dialogBounds.viewportWidth + 1);

  await dialog.getByRole('radio', { name: 'Pas aujourd’hui' }).click();
  await saveButton.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('1 étape sur 4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier le check-in' })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
