import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

async function createGoal(
  page: import('@playwright/test').Page,
  metric: string,
  title: string,
  target: string,
) {
  await page.goto('/#/goals');
  await page.getByRole('button', { name: 'Créer un objectif' }).click();

  const dialog = page.getByRole('dialog', { name: 'Créer un objectif' });
  await dialog.getByLabel(/Type d’objectif/).selectOption(metric);
  await dialog.getByLabel('Nom personnalisé').fill(title);
  await dialog.getByLabel(/Cible/).fill(target);
  await dialog.getByRole('button', { name: 'Créer l’objectif' }).click();

  await expect(dialog).toBeHidden();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
}

test('ouvre la saisie des pas depuis un objectif actif', async ({ page }) => {
  await createLocalProfile(page);
  await createGoal(page, 'totalSteps', 'Pas contextuels', '120000');

  await page.getByRole('link', { name: 'Saisir les pas' }).click();

  await expect(page).toHaveURL(/#\/\?action=steps$/);
  const dialog = page.getByRole('dialog', { name: 'Saisir les pas' });
  await expect(dialog).toBeVisible();

  const input = dialog.getByRole('spinbutton', {
    name: /Pas totaux de la journée/,
  });
  await input.fill('6800');
  await dialog.getByRole('button', { name: 'Enregistrer' }).click();

  await expect(dialog).toBeHidden();
  await expect(page).not.toHaveURL(/action=steps/);
  await expectNoCriticalHorizontalOverflow(page);
});

test('ouvre la planification depuis un objectif de minutes actif', async ({ page }) => {
  await createLocalProfile(page);
  await createGoal(page, 'activityMinutes', 'Minutes contextuelles', '600');

  await page.getByRole('link', { name: 'Planifier une activité' }).click();

  await expect(page).toHaveURL(/#\/strength\/planning\?action=plan$/);
  await expect(
    page.getByRole('heading', { name: 'Planning sportif', level: 1 }),
  ).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Planifier une activité' }),
  ).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
