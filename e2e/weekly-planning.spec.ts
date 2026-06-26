import { expect, test } from '@playwright/test';
import { createLocalProfile, expectNoCriticalHorizontalOverflow, getBrowserLocalDate } from './helpers/app';

test('planifie une séance modèle puis démarre la même séance', async ({ page }) => {
  await createLocalProfile(page);

  await page.goto('/#/strength/templates/new');
  await expect(page.getByRole('heading', { name: 'Créer une séance modèle' })).toBeVisible();
  await page.getByLabel('Nom de la séance').fill('Planning E2E');
  await page.getByRole('button', { name: 'Ajouter un exercice' }).click();
  await page.getByRole('button', { name: 'Créer la séance' }).click();
  await expect(page.getByRole('heading', { name: 'Séances modèles' })).toBeVisible();

  await page.goto('/#/strength/planning');
  await expect(page.getByRole('heading', { name: 'Planning hebdomadaire' })).toBeVisible();
  const today = await getBrowserLocalDate(page);
  await page.getByLabel('Séance modèle').selectOption({ label: 'Planning E2E' });
  await page.getByLabel('Date prévue').fill(today);
  await page.getByRole('button', { name: 'Planifier' }).click();

  await expect(page.getByRole('heading', { name: 'Planning E2E' })).toBeVisible();
  await expect(page.getByText('Prévue', { exact: true })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Démarrer' }).click();
  await expect(page.getByRole('heading', { name: 'Planning E2E' })).toBeVisible();
  await expect(page.getByText('En cours', { exact: true })).toBeVisible();
});
