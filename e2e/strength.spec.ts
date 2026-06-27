import { expect, test } from '@playwright/test';
import { createLocalProfile } from './helpers/app';

test('crée un modèle, démarre une séance, valide une série et termine', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/strength/templates/new');
  await expect(page.getByRole('heading', { name: 'Créer une séance modèle' })).toBeVisible();
  await page.getByLabel('Nom de la séance').fill('Push E2E');
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByRole('button', { name: 'Créer la séance' }).click();

  await expect(page.getByRole('heading', { name: 'Séances modèles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push E2E' })).toBeVisible();
  await page.getByRole('button', { name: 'Démarrer la séance' }).click();

  await expect(page.getByRole('heading', { name: 'Push E2E' })).toBeVisible();
  await page.getByRole('button', { name: 'Ajouter une série' }).click();
  await page.getByLabel('Charge en kg').fill('40');
  await page.getByLabel('Répétitions').fill('10');
  await page.getByLabel('RPE').fill('8');
  await page.getByRole('button', { name: 'Valider la série' }).click();
  await expect(page.getByRole('button', { name: 'Rouvrir la série' })).toBeVisible();
  const restTimer = page.getByRole('region', { name: 'Minuteur de repos' });
  await expect(restTimer).toBeVisible();
  await expect(restTimer.getByRole('timer')).toContainText(/01:5[0-9]|02:00/);
  await restTimer.getByRole('button', { name: 'Pause' }).click();
  await expect(restTimer.getByRole('button', { name: 'Reprendre' })).toBeVisible();
  await restTimer.getByRole('button', { name: 'Arrêter le minuteur' }).click();
  await expect(restTimer).not.toBeVisible();

  await page.getByRole('button', { name: 'Terminer' }).click();
  const dialog = page.getByRole('alertdialog', { name: 'Terminer la séance ?' });
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Terminer la séance' }).click();
  await expect(page.getByRole('heading', { name: 'Mes entraînements' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push E2E' })).toBeVisible();
});
