import { expect, test, type Page } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow, getBrowserLocalDate } from './helpers/app';

const TEST_PHOTO = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9WlP8AAAAASUVORK5CYII=',
  'base64',
);

async function selectNutritionPhoto(page: Page) {
  await page.getByLabel('Choisir une photo').setInputFiles({
    name: 'repas-a-conserver.png',
    mimeType: 'image/png',
    buffer: TEST_PHOTO,
  });
}

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

test('protège puis enregistre une saisie Photo Nutrition', async ({ page }) => {
  await createLocalProfile(page);
  const date = await getBrowserLocalDate(page);

  await page.goto(`/#/food/photo-estimate?date=${date}&slot=lunch`);
  await page.getByRole('link', { name: 'Nutrition', exact: true }).first().click();
  await expect(page).toHaveURL(/#\/food$/);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await page.goto(`/#/food/photo-estimate?date=${date}&slot=lunch`);
  await selectNutritionPhoto(page);
  await page.getByRole('button', { name: 'Saisir manuellement' }).click();
  await page.getByLabel('Nom du repas').fill('Repas photo protégé');
  await page.getByLabel('Quantité en g/ml').fill('350');
  await page.getByLabel('Calories approximatives').fill('640');

  await page.getByRole('link', { name: 'Nutrition', exact: true }).first().click();
  const guardDialog = page.getByRole('alertdialog', {
    name: 'Quitter sans enregistrer ?',
  });
  await expect(guardDialog).toBeVisible();
  await guardDialog.getByRole('button', { name: 'Continuer la modification' }).click();
  await expect(page.getByText('repas-a-conserver.png')).toBeVisible();
  await expect(page.getByLabel('Nom du repas')).toHaveValue('Repas photo protégé');

  await page.getByRole('link', { name: 'Nutrition', exact: true }).first().click();
  await guardDialog.getByRole('button', { name: 'Quitter' }).click();
  await expect(page).toHaveURL(/#\/food$/);

  await page.goto(`/#/food/photo-estimate?date=${date}&slot=lunch`);
  await selectNutritionPhoto(page);
  await page.getByRole('button', { name: 'Saisir manuellement' }).click();
  await page.getByLabel('Nom du repas').fill('Repas photo enregistré');
  await page.getByLabel('Quantité en g/ml').fill('350');
  await page.getByLabel('Calories approximatives').fill('640');
  await page.getByRole('button', { name: 'Ajouter au journal' }).click();

  await expect(page).toHaveURL(new RegExp(`#\\/food\\?date=${date}$`));
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
  await expect(page.getByText('Repas photo enregistré')).toBeVisible();
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
