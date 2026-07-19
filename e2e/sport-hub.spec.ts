import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('présente le hub Sport et ouvre les méthodes de démarrage', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/activities');

  await expect(page.getByRole('heading', { name: 'Sport' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Démarrer ou ajouter une activité' })).toBeVisible();
  await expect(page.getByRole('group', { name: 'Résumé de la semaine' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Activités du/ })).toBeVisible();

  await page.getByRole('button', { name: 'Choisir l’activité' }).click();
  const sheet = page.getByRole('dialog', { name: 'Démarrer ou ajouter une activité' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Course/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Musculation/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Marche/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Vélo/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Natation/ })).toBeVisible();

  await expectNoCriticalHorizontalOverflow(page);
});
