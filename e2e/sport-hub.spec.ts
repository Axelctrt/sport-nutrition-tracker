import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('présente le hub Sport et ouvre les méthodes de démarrage', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/activities');

  await expect(page.getByRole('heading', { name: 'Sport', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Aujourd’hui' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Organiser' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Dernières activités' })).toBeVisible();

  await page.getByRole('button', { name: 'Ajouter une activité déjà réalisée' }).click();
  const sheet = page.getByRole('dialog', { name: 'Enregistrer une activité' });
  await expect(sheet).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Course/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Musculation/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Marche/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Vélo/ })).toBeVisible();
  await expect(sheet.getByRole('link', { name: /Natation/ })).toBeVisible();

  await expectNoCriticalHorizontalOverflow(page);
});
