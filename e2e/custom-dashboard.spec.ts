import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('personnalise l’affichage de l’Accueil et conserve le choix', async ({ page, isMobile }) => {
  await createLocalProfile(page);

  await page.locator('a[href="#/settings/dashboard"]').click();
  await expect(page.getByRole('heading', { name: 'Affichage de l’Accueil' })).toBeVisible();

  await page.getByText('Progression de la semaine', { exact: true }).click();
  await page.getByText('Compact', { exact: true }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(/L’affichage est enregistré/)).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  if (isMobile) {
    await page.getByLabel('Retour', { exact: true }).click();
  } else {
    await page.getByRole('link', { name: 'Retour à l’Accueil' }).click();
  }
  await expect(page.getByText('Cible alimentaire guidée')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Assistant du jour' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cette semaine' })).toBeVisible();
  await expect(page.locator('[data-dashboard-widget]')).toHaveCount(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Cible alimentaire guidée')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Cette semaine' })).toBeVisible();
});
