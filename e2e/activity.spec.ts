import { expect, test } from '@playwright/test';
import { createLocalProfile } from './helpers/app';

test('ajoute une course et recharge directement le journal', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/activities/add/running');
  await expect(page.getByRole('heading', { name: 'Ajouter une course' })).toBeVisible();
  await page.locator('#activity-duration').fill('50');
  await page.locator('#running-distance').fill('8');
  await page.locator('#running-cadence').fill('172');
  await page.getByRole('button', { name: 'Ajouter l’activité' }).click();

  await expect(page.getByRole('heading', { name: 'Activités' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Footing' })).toBeVisible();

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Footing' })).toBeVisible();
});
