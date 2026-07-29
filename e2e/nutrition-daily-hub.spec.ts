import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow, getBrowserLocalDate } from './helpers/app';

test('affiche le hub Nutrition quotidien et prépare un ajout par repas', async ({ page }) => {
  await createLocalProfile(page);
  const date = await getBrowserLocalDate(page);

  await page.goto(`/#/food?date=${date}`);

  await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible();
  await expect(page.getByLabel('Résumé nutritionnel de la journée')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Petit-déjeuner/ })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /^Déjeuner/ })).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: /^Petit-déjeuner/ }).click();
  await expect(page.getByRole('button', { name: /^Petit-déjeuner/ })).toHaveAttribute('aria-expanded', 'true');
  await page.getByRole('button', { name: /^Petit-déjeuner/ }).click();
  await expect(page.getByRole('button', { name: /^Petit-déjeuner/ })).toHaveAttribute('aria-expanded', 'false');

  await page.getByRole('button', { name: /^Déjeuner/ }).click();
  await expect(page.getByRole('button', { name: /^Petit-déjeuner/ })).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('button', { name: /^Déjeuner/ })).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('button', { name: 'Ajouter un aliment au déjeuner' }).click();
  const mealComposer = page.getByRole('dialog', { name: /Ajouter un repas/ });
  await expect(mealComposer).toBeVisible();
  await mealComposer.getByRole('button', { name: 'Ajouter un élément' }).click();
  await mealComposer.getByRole('button', { name: /Rechercher un aliment/ }).click();
  await expect(mealComposer.getByRole('link', { name: /Mes aliments/ })).toHaveAttribute(
    'href',
    `#/food/select?date=${date}&slot=lunch&source=all`,
  );

  await expectNoCriticalHorizontalOverflow(page);
});
