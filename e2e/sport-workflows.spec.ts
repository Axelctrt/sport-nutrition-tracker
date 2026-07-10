import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('guide une séance de musculation et compacte une série validée', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/strength/templates/new');
  await page.getByLabel('Nom de la séance').fill('Séance guidée E2E');
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByRole('button', { name: 'Créer la séance' }).click();
  await page.getByRole('button', { name: 'Démarrer la séance' }).click();

  await expect(page.getByRole('heading', { name: 'Progression de la séance' })).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progression de la séance' })).toHaveAttribute('aria-valuenow', '0');
  await expect(page.getByText('À faire maintenant').first()).toBeVisible();

  await page.getByRole('button', { name: 'Ajouter une série' }).click();
  await page.getByLabel('Charge en kg').fill('50');
  await page.getByLabel('Répétitions').fill('10');
  await page.getByLabel('RPE').fill('8');
  await page.getByRole('button', { name: 'Valider la série' }).click();

  await expect(page.getByText('50 kg · 10 reps · RPE 8')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Rouvrir la série' })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});

test('utilise les raccourcis de durée et intensité pour une activité cardio', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/activities/add/other');
  await expect(page.getByRole('heading', { name: 'Ajouter une autre activité' })).toBeVisible();

  await page.getByLabel("Type d’activité").selectOption('otherCardio');
  await page.getByRole('button', { name: '60 minutes' }).click();
  await page.getByRole('button', { name: 'Élevée' }).click();

  await expect(page.locator('#activity-duration')).toHaveValue('60');
  await expect(page.getByRole('button', { name: '60 minutes' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('button', { name: 'Élevée' })).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Ajouter l’activité' }).click();
  await expect(page.getByRole('heading', { name: 'Sport' })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
