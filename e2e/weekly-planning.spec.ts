import { expect, test } from '@playwright/test';
import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
  getBrowserLocalDate,
} from './helpers/app';

test('planifie une séance modèle depuis la surface dédiée puis la démarre', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/strength/templates/new');
  await expect(page.getByRole('heading', { name: 'Créer une séance modèle' })).toBeVisible();
  await page.getByLabel('Nom de la séance').fill('Planning E2E');
  await page.getByRole('searchbox', { name: 'Rechercher un exercice à ajouter au modèle' }).fill('Développé couché');
  await page.getByRole('button', { name: 'Ajouter Développé couché' }).click();
  await page.getByRole('button', { name: 'Créer la séance' }).click();
  await expect(page.getByRole('heading', { name: 'Séances modèles' })).toBeVisible();

  await page.goto('/#/strength/planning');
  await expect(page.getByRole('heading', { name: 'Planning sportif' })).toBeVisible();
  const today = await getBrowserLocalDate(page);
  await page.getByRole('button', { name: 'Planifier', exact: true }).click();
  const choiceDialog = page.getByRole('dialog', { name: 'Planifier une activité' });
  await expect(choiceDialog).toBeVisible();
  await choiceDialog.getByRole('button', { name: /^Musculation/ }).click();

  const strengthDialog = page.getByRole('dialog', {
    name: 'Planifier une séance de musculation',
  });
  await strengthDialog.getByLabel('Séance modèle', { exact: true }).selectOption({ label: 'Planning E2E' });
  await strengthDialog.getByLabel('Date prévue').fill(today);
  await strengthDialog.getByRole('button', { name: 'Planifier la séance' }).click();

  await expect(strengthDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Planning E2E' })).toBeVisible();
  await expect(page.getByText('Prévue', { exact: true })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page.getByRole('heading', { name: 'Planning E2E' })).toBeVisible();
  await expect(page.getByText('En cours', { exact: true })).toBeVisible();
});

test('ouvre Prévoir en création et planifie une activité d’endurance', async ({ page }) => {
  await createLocalProfile(page);
  const today = await getBrowserLocalDate(page);

  await page.goto(`/#/strength/planning?date=${today}&action=plan`);
  const choiceDialog = page.getByRole('dialog', { name: 'Planifier une activité' });
  await expect(choiceDialog).toBeVisible();
  await choiceDialog.getByRole('button', { name: /^Endurance/ }).click();

  const enduranceDialog = page.getByRole('dialog', {
    name: 'Planifier une activité d’endurance',
  });
  await expect(enduranceDialog.getByLabel('Date prévue')).toHaveValue(today);
  await enduranceDialog.getByLabel('Nom facultatif').fill('Footing Preview');
  await enduranceDialog.getByRole('button', { name: 'Planifier l’activité' }).click();

  await expect(enduranceDialog).toBeHidden();
  await expect(page.getByText('Activité planifiée', { exact: true })).toBeVisible();
  await page.getByText('Course, natation, vélo et cardio', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Footing Preview' })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
