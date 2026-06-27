import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('utilise un modèle de course puis enregistre une sortie vélo enrichie', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/activities/templates');
  await expect(page.getByRole('heading', { name: 'Modèles d’endurance' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Course facile 45 min' })).toBeVisible();
  await page.getByRole('link', { name: 'Utiliser' }).first().click();

  await expect(page.getByRole('heading', { name: 'Ajouter une course' })).toBeVisible();
  await expect(page.locator('#activity-duration')).toHaveValue('45');
  await expect(page.locator('#running-distance')).toHaveValue('7');
  await expect(page.locator('#running-cadence')).toHaveValue('170');
  await page.getByLabel('Terrain').selectOption('trail');
  await page.getByLabel('Dénivelé positif (m)').fill('120');
  await page.getByRole('button', { name: 'Ajouter l’activité' }).click();

  await expect(page.getByRole('heading', { name: 'Footing' })).toBeVisible();
  await expect(page.getByText('D+ 120 m')).toBeVisible();
  await expect(page.getByText('Trail')).toBeVisible();

  await page.goto('/#/activities/add/other');
  await expect(page.getByRole('heading', { name: 'Ajouter une autre activité' })).toBeVisible();
  await page.locator('#activity-duration').fill('60');
  await page.locator('#cycling-distance').fill('30');
  await page.locator('#cycling-elevation').fill('250');
  await page.getByLabel('Type de vélo').selectOption('road');
  await page.getByLabel('Environnement').selectOption('outdoor');
  await page.getByRole('button', { name: 'Ajouter l’activité' }).click();

  await expect(page.getByRole('heading', { name: 'Vélo' })).toBeVisible();
  await expect(page.getByText('30 km/h')).toBeVisible();
  await expect(page.getByText('D+ 250 m')).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.goto('/#/analytics');
  await expect(page.getByRole('heading', { name: 'Analyses' })).toBeVisible();
  await expect(page.getByText('120 m', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: /^Vélo/ }).click();
  const highestCyclingElevation = page.getByText('Plus grand D+', { exact: true }).locator('..');
  await expect(highestCyclingElevation.getByText('250 m', { exact: true })).toBeVisible();
});
