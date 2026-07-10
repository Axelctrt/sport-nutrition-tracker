import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow, getBrowserLocalDate } from './helpers/app';

test('propose les méthodes d’ajout Nutrition et conserve le repas', async ({ page }) => {
  await createLocalProfile(page);
  const date = await getBrowserLocalDate(page);

  await page.goto(`/#/food/select?date=${date}&slot=lunch`);

  await expect(page.getByRole('heading', { name: 'Ajouter un aliment' })).toBeVisible();
  await expect(page.getByLabel('Méthodes d’ajout d’un aliment')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Scanner/ })).toHaveAttribute(
    'href',
    `/food/barcode-scanner?date=${date}&slot=lunch`,
  );
  await expect(page.getByRole('link', { name: /^Photo/ })).toHaveAttribute(
    'href',
    `/food/photo-estimate?date=${date}&slot=lunch`,
  );
  await expect(page.getByRole('link', { name: /^Recettes/ })).toHaveAttribute(
    'href',
    `/recipes?date=${date}&slot=lunch`,
  );
  await expect(page.getByRole('link', { name: /^Repas favoris/ })).toHaveAttribute(
    'href',
    `/food/favorites?date=${date}&slot=lunch`,
  );

  await page.getByRole('link', { name: /^Photo/ }).click();
  await expect(page.getByRole('heading', { name: 'Estimation photo' })).toBeVisible();
  await expect(page.getByText('Autoriser l’analyse IA pour cette photo')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Retour au journal' })).toHaveAttribute(
    'href',
    `/food?date=${date}`,
  );

  await expectNoCriticalHorizontalOverflow(page);
});
