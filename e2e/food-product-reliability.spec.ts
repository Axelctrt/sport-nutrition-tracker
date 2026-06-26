import { expect, test, type Page } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

async function fillProduct(page: Page) {
  await page.getByLabel('Nom de l’aliment').fill('Yaourt fiabilité E2E');
  await page.getByLabel('Marque').fill('SportPilot');
  await page.getByLabel('Taille d’une portion en g').fill('125');
  await page.getByLabel('Nom de la portion').fill('1 pot');
  await page.getByLabel('Calories').fill('68');
  await page.getByLabel('Protéines').fill('5');
  await page.getByLabel('Glucides').fill('7');
  await page.getByLabel('Lipides').fill('2');
  await page.getByText('Informations facultatives', { exact: true }).click();
  await page.getByLabel('Fibres').fill('1.5');
  await page.getByLabel('Sel').fill('0.12');
  await page.getByLabel('Code-barres').fill('3017624010701');
}

test('enregistre une portion complète puis bloque un code-barres en doublon', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/food/products/new');
  await fillProduct(page);
  await page.getByRole('button', { name: 'Créer l’aliment' }).click();

  await expect(page.getByRole('heading', { name: 'Aliments locaux' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Yaourt fiabilité E2E' })).toBeVisible();
  await expect(page.getByText(/1 pot/)).toBeVisible();
  await expect(page.getByText('Fibres 1,5 g')).toBeVisible();
  await expect(page.getByText('Sel 0,12 g')).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.goto('/#/food/products/new');
  await fillProduct(page);
  await page.getByRole('button', { name: 'Créer l’aliment' }).click();

  await expect(page.getByText('Doublon potentiel détecté')).toBeVisible();
  await expect(page.getByText('Un aliment possède déjà ce code-barres. Modifie plutôt l’aliment existant.')).toBeVisible();
  await expect(page.getByRole('link', { name: /Ouvrir « Yaourt fiabilité E2E »/ })).toBeVisible();
});
