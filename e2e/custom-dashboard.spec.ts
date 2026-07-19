import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('personnalise les blocs du tableau de bord et conserve le choix', async ({ page, isMobile }) => {
  await createLocalProfile(page);

  await page.getByRole('link', { name: /Personnaliser|Blocs/ }).click();
  await expect(page.getByRole('heading', { name: 'Personnaliser l’Accueil' })).toBeVisible();

  await page.getByRole('button', { name: /Essentiel/ }).click();
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(page.getByText(/La disposition est enregistrée/)).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  if (isMobile) {
    await page.getByRole('button', { name: 'Retour' }).click();
  } else {
    await page.getByRole('link', { name: 'Retour à l’Accueil' }).click();
  }
  await expect(page.getByText('Calories consommées')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Actions rapides' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Objectifs et détails du calcul/ })).toHaveCount(0);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Calories consommées')).toBeVisible();
  await expect(page.getByRole('button', { name: /Objectifs et détails du calcul/ })).toHaveCount(0);
});
