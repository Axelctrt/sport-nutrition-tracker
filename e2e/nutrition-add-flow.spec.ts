import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow, getBrowserLocalDate } from './helpers/app';

test('propose les méthodes d’ajout Nutrition et conserve le repas', async ({ page, isMobile }) => {
  await createLocalProfile(page);
  const date = await getBrowserLocalDate(page);

  await page.goto(`/#/food/select?date=${date}&slot=lunch`);

  await expect(page.getByRole('heading', { name: 'Ajouter un aliment' })).toBeVisible();
  await expect(page.getByLabel('Méthodes d’ajout d’un aliment')).toBeVisible();
  await expect(page.getByRole('link', { name: /^Scanner/ })).toHaveAttribute(
    'href',
    `#/food/barcode-scanner?date=${date}&slot=lunch`,
  );
  await expect(page.getByRole('link', { name: /^Photo/ })).toHaveAttribute(
    'href',
    `#/food/photo-estimate?date=${date}&slot=lunch`,
  );
  await expect(page.getByRole('link', { name: /^Recettes/ })).toHaveAttribute(
    'href',
    `#/recipes?date=${date}&slot=lunch`,
  );
  await expect(page.getByRole('link', { name: /^Repas favoris/ })).toHaveAttribute(
    'href',
    `#/food/favorites?date=${date}&slot=lunch`,
  );

  await page.getByRole('link', { name: /^Photo/ }).click();
  await expect(page.getByRole('heading', { name: 'Estimation photo' })).toBeVisible();
  await expect(page.getByText('Analyse IA', { exact: true })).toBeVisible();
  await expect(page.getByText('Désactivée', { exact: true })).toBeVisible();
  await expect(page.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' }))
    .toHaveAttribute('aria-checked', 'false');
  if (isMobile) {
    await page.getByRole('button', { name: 'Retour' }).click();
    await expect(page).toHaveURL(
      new RegExp(`#\\/food\\/select\\?date=${date}&slot=lunch$`),
    );
  } else {
    await expect(page.getByRole('link', { name: 'Retour au journal' })).toHaveAttribute(
      'href',
      `#/food?date=${date}`,
    );
  }

  await expectNoCriticalHorizontalOverflow(page);
});

test('ouvre directement la source choisie et active la recherche', async ({ page, browserName }) => {
  await createLocalProfile(page);
  const date = await getBrowserLocalDate(page);
  await page.goto(`/#/food?date=${date}`);

  await expect(page.getByRole('button', { name: /^Déjeuner/ })).toHaveAttribute('aria-expanded', 'false');
  await page.getByRole('button', { name: /^Déjeuner/ }).click();
  await page.getByRole('button', { name: 'Ajouter un aliment au déjeuner' }).click();
  const composer = page.getByRole('dialog', { name: 'Ajouter un repas' });
  await composer.getByRole('button', { name: 'Ajouter un élément' }).click();
  await composer.getByRole('button', { name: /Rechercher un aliment/ }).click();

  await expect(composer.getByRole('link', { name: /Mes aliments/ })).toHaveAttribute(
    'href',
    `#/food/select?date=${date}&slot=lunch&source=all`,
  );
  await composer.getByRole('link', { name: /Mes aliments/ }).click();

  const searchInput = page.getByLabel('Rechercher dans mes aliments');
  await expect(searchInput).toBeVisible();
  if (browserName === 'webkit') {
    await searchInput.click();
  }
  await expect(searchInput).toBeFocused();
  await expect(page.getByText('Choisir une méthode')).toHaveCount(0);
});
