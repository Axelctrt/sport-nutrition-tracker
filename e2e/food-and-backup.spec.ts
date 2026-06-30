import { expect, test } from '@playwright/test';
import { createLocalProfile, getBrowserLocalDate } from './helpers/app';

test('crée un aliment local puis l’ajoute au journal', async ({ page }) => {
  await createLocalProfile(page);

  const date = await getBrowserLocalDate(page);
  await page.goto(`/#/food/products/new?returnDate=${date}&returnSlot=lunch`);
  await page.getByLabel('Nom de l’aliment').fill('Yaourt E2E');
  await page.getByLabel('Calories').fill('120');
  await page.getByLabel('Protéines').fill('10');
  await page.getByLabel('Glucides').fill('8');
  await page.getByLabel('Lipides').fill('4');
  await page.getByRole('button', { name: 'Créer l’aliment' }).click();

  await expect(page.getByRole('heading', { name: 'Ajouter un aliment' })).toBeVisible();
  const quickDialog = page.getByRole('dialog', { name: 'Yaourt E2E' });
  await expect(quickDialog).toBeVisible();
  await quickDialog.getByRole('button', { name: /Ajouter au déjeuner/i }).click();

  await expect(page.getByRole('heading', { name: 'Journal alimentaire' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Yaourt E2E' })).toBeVisible();
});

test('exporte puis restaure une sauvegarde JSON', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/backup');

  await expect(
    page.getByRole('heading', {
      name: 'Sauvegarde et restauration',
    }),
  ).toBeVisible();

  const downloadButton = page
    .locator('button')
    .filter({ hasText: 'Télécharger le JSON' })
    .first();

  await expect(downloadButton).toHaveCount(1);

  await downloadButton.evaluate((element) => {
    const details = element.closest('details');

    if (
      details instanceof HTMLDetailsElement &&
      !details.open
    ) {
      details.querySelector('summary')?.click();
    }
  });

  await expect(downloadButton).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await downloadButton.click();

  const download = await downloadPromise;
  const backupPath = await download.path();

  expect(backupPath).toBeTruthy();

  const backupInput = page
    .locator('input[type="file"]')
    .first();

  await expect(backupInput).toHaveCount(1);
  await backupInput.setInputFiles(backupPath!);

  await expect(
    page.getByText('Sauvegarde validée'),
  ).toBeVisible();

  const restoreButton = page.getByRole('button', {
    name: 'Restaurer cette sauvegarde',
  });

  await restoreButton.evaluate((element) => {
    const details = element.closest('details');

    if (
      details instanceof HTMLDetailsElement &&
      !details.open
    ) {
      details.querySelector('summary')?.click();
    }
  });

  await expect(restoreButton).toBeVisible();
  await restoreButton.click();

  const dialog = page.getByRole('alertdialog', {
    name: 'Remplacer toutes les données ?',
  });

  await expect(dialog).toBeVisible();

  await dialog
    .getByRole('button', {
      name: 'Importer et remplacer',
    })
    .click();

  await expect(
    page.getByRole('heading', {
      name: /Bonjour E2E|Tableau de bord/,
    }),
  ).toBeVisible();
});
