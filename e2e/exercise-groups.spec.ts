import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('crée un superset et conserve ses exercices indépendants dans la séance', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/strength/templates/new');
  await expect(page.getByRole('heading', { name: 'Créer une séance modèle' })).toBeVisible();
  await page.getByLabel('Nom de la séance').fill('Superset E2E');
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();

  const exerciseSelects = page.locator('select[id^="workout-template-exercise-"]');
  await expect(exerciseSelects).toHaveCount(2);
  const firstExerciseId = await exerciseSelects.nth(0).inputValue();
  const secondExerciseId = await exerciseSelects.nth(1).locator('option').evaluateAll(
    (options, excluded) => options.map((option) => (option as HTMLOptionElement).value)
      .find((value) => value && value !== excluded),
    firstExerciseId,
  );
  expect(secondExerciseId).toBeTruthy();
  await exerciseSelects.nth(1).selectOption(secondExerciseId!);

  await page.getByRole('button', { name: 'Créer un superset' }).first().click();
  await page.getByLabel('Nom facultatif').fill('Poussée / tirage');
  await page.getByLabel('Nombre de tours').fill('3');
  await page.getByLabel('Repos entre exercices (s)').fill('15');
  await page.getByLabel('Repos entre tours (s)').fill('90');
  await page.getByRole('button', { name: 'Créer la séance' }).click();

  await expect(page.getByRole('heading', { name: 'Séances modèles' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Superset E2E' })).toBeVisible();
  await page.getByRole('button', { name: 'Démarrer la séance' }).click();

  await expect(page.getByRole('heading', { name: 'Superset E2E' })).toBeVisible();
  await expect(page.getByText('A1', { exact: true })).toBeVisible();
  await expect(page.getByText('A2', { exact: true })).toBeVisible();
  await expect(page.getByText('Poussée / tirage')).toHaveCount(2);

  const firstCard = page.getByText('A1', { exact: true }).locator(
    'xpath=ancestor::div[starts-with(@id, "workout-exercise-")][1]',
  );
  await firstCard.getByRole('button', { name: 'Ajouter une série' }).click();
  await firstCard.getByLabel('Répétitions').fill('10');
  await firstCard.getByRole('button', { name: 'Valider la série' }).click();
  await expect(firstCard.getByRole('button', { name: 'Rouvrir la série' })).toBeVisible();

  const restTimer = page.getByRole('region', { name: 'Minuteur de repos' });
  await expect(restTimer).toBeVisible();
  await expect(restTimer).toContainText(/Transition vers/);
  await expect(restTimer.getByRole('timer')).toContainText(/00:1[0-5]/);
  await restTimer.getByRole('button', { name: 'Arrêter le minuteur' }).click();

  await firstCard.getByRole('button', { name: 'Passer pour l’instant' }).click();
  await expect(firstCard.getByText('Passé temporairement')).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
