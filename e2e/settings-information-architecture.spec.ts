import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('parcourt les catégories de paramètres sans perdre les routes existantes', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/settings');

  await expect(page.getByRole('heading', { name: 'Paramètres', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Profil et objectifs/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Compte et synchronisation/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Données, sauvegardes et export/ })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('searchbox', { name: 'Rechercher dans les paramètres' }).fill('sauvegarde');
  await expect(page.getByRole('link', { name: /Données, sauvegardes et export/ })).toBeVisible();
  await expect(page.getByRole('link', { name: /Apparence et accessibilité/ })).toHaveCount(0);

  await page.getByRole('link', { name: /Données, sauvegardes et export/ }).click();
  await expect(page.getByRole('heading', { name: 'Données, sauvegardes et export', level: 1 })).toBeVisible();
  await expect(page.getByRole('link', { name: /Sauvegardes, import et export/ })).toHaveAttribute('href', '#/backup');
  await expectNoCriticalHorizontalOverflow(page);

  await page.goto('/#/settings/advanced');
  await expect(page.getByRole('heading', { name: 'Paramètres avancés', level: 1 })).toBeVisible();
});
