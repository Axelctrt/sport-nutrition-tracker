import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('personnalise les blocs du tableau de bord et conserve le choix', async ({ page }) => {
  await createLocalProfile(page);

  await page.getByRole('link', { name: /Personnaliser|Blocs/ }).click();
  await expect(page.getByRole('heading', { name: 'Personnaliser le tableau de bord' })).toBeVisible();

  await page.getByRole('button', { name: /Essentiel/ }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText('Le tableau de bord a été personnalisé sur cet appareil.')).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('link', { name: 'Retour au tableau de bord' }).click();
  await expect(page.getByText('Calories consommées')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actions rapides' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Objectifs et détails du calcul/ })).toHaveCount(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Calories consommées')).toBeVisible();
  await expect(page.getByRole('button', { name: /Objectifs et détails du calcul/ })).toHaveCount(0);
});
