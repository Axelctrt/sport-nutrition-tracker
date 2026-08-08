import { expect, test } from '@playwright/test';
import { createLocalProfile } from './helpers/app';

test('crée un modèle, démarre une séance, valide une série et termine', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/strength/templates/new');
  await expect(page.getByRole('heading', { name: 'Créer une séance modèle' })).toBeVisible();
  await page.getByLabel('Nom de la séance').fill('Push E2E');
  await page.getByRole('searchbox', { name: 'Rechercher un exercice à ajouter au modèle' }).fill('Développé couché');
  await page.getByRole('button', { name: 'Ajouter Développé couché' }).click();
  await page.getByRole('button', { name: 'Créer la séance' }).click();

  await expect(page.getByRole('heading', { name: 'Séances modèles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push E2E' })).toBeVisible();
  await page.getByRole('button', { name: 'Démarrer la séance' }).click();

  await expect(page.getByRole('heading', { name: 'Push E2E' })).toBeVisible();
  const firstSet = page.getByRole('article', { name: 'Série 1' });
  await firstSet.getByLabel('Charge en kg').fill('40');
  const repetitions = firstSet.getByLabel('Répétitions');
  await repetitions.fill('1');
  await expect(firstSet.getByText('Enregistré', { exact: true })).toBeVisible();
  await repetitions.focus();
  await expect(repetitions).toBeFocused();
  await page.keyboard.type('2');
  await expect(repetitions).toHaveValue('12');
  await repetitions.fill('10');
  await firstSet.getByText('Options discrètes').click();
  await firstSet.getByLabel('RPE').fill('8');
  await firstSet.getByRole('button', { name: 'Valider la série' }).click();
  await expect(firstSet.getByRole('button', { name: 'Modifier la série 1' })).toBeVisible();
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
  await expect(page.getByText('Séance enregistrée')).toBeVisible();
  await expect(page.getByText('Ta séance a bien été ajoutée à l’historique.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Push E2E' })).toBeVisible();
});