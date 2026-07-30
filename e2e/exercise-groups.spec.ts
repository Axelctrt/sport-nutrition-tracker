import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('crée un superset et conserve ses exercices indépendants dans la séance', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/strength/templates/new');
  await expect(page.getByRole('heading', { name: 'Créer une séance modèle' })).toBeVisible();
  await page.getByLabel('Nom de la séance').fill('Superset E2E');
  const exerciseSearch = page.getByRole('searchbox', {
    name: 'Rechercher un exercice à ajouter au modèle',
  });
  await exerciseSearch.fill('Développé couché');
  await page.getByRole('button', { name: 'Ajouter Développé couché' }).click();
  await exerciseSearch.fill('Rowing barre');
  await page.getByRole('button', { name: 'Ajouter Rowing barre' }).click();

  await page.getByText('Organiser en superset ou circuit').click();
  const organization = page.getByText('Organiser en superset ou circuit').locator(
    'xpath=ancestor::details[1]',
  );
  await organization.getByRole('checkbox', { name: 'Développé couché à la barre' }).check();
  await organization.getByRole('checkbox', { name: 'Rowing barre' }).check();
  await organization.getByRole('button', { name: 'Créer le groupe' }).click();
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
  const firstSet = firstCard.getByRole('article', { name: 'Série 1' });
  await firstSet.getByLabel('Répétitions').fill('10');
  await firstSet.getByRole('button', { name: 'Valider la série' }).click();
  const reopenFirstExercise = firstCard.getByRole('button', { name: /^Développer / });
  await expect(reopenFirstExercise).toBeVisible();
  await reopenFirstExercise.click();
  await expect(firstSet.getByRole('button', { name: 'Modifier la série 1' })).toBeVisible();

  const restTimer = page.getByRole('region', { name: 'Minuteur de repos' });
  await expect(restTimer).toBeVisible();
  await expect(restTimer).toContainText(/Transition vers/);
  await expect(restTimer.getByRole('timer')).toContainText(/00:1[0-5]/);
  await restTimer.getByRole('button', { name: 'Arrêter le minuteur' }).click();

  await firstCard.getByRole('button', { name: 'Passer pour l’instant' }).click();
  await expect(firstCard.getByText('Passé temporairement')).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
