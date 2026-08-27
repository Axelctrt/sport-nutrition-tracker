import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('explique le Bilan du Coach sans inventer de signaux sur iPhone 15', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'webkit-iphone-15',
    'Ce parcours cible le viewport mobile WebKit de l’iPhone 15.',
  );

  await createLocalProfile(page, 'Adaptation E2E');
  await page.goto('/#/weekly-review');

  await expect(page.getByRole('heading', { level: 1, name: 'Bilan du Coach' }))
    .toBeVisible();

  for (const heading of [
    'Diagnostic',
    'Confiance',
    'Pourquoi',
    'Signaux',
    'Corps',
    'Nutrition',
    'Activité',
    'Récupération',
    'Performance musculation',
    'Décision du Coach',
    'Plan de la prochaine période',
    'Réévaluation',
  ]) {
    await expect(page.getByRole('heading', { name: heading, exact: true })).toBeVisible();
  }

  await expect(page.getByText('Données insuffisantes', { exact: true }).first()).toBeVisible();
  await expect(page.getByText('Poids : Non disponible', { exact: true })).toBeVisible();
  await expect(page.getByText('Niveau réel/attendu : Non disponible', { exact: true }))
    .toBeVisible();
  await expect(page.getByText('Aucun signal qualifié disponible', { exact: true }))
    .toBeVisible();
  await expect(page.getByRole('button', { name: 'Accepter', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Refuser', exact: true })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Confirmer le maintien', exact: true }))
    .toHaveCount(0);

  await expect(page.getByText('Semaine observée', { exact: true })).toBeVisible();
  await expect(page.getByText(/Tendance Coach analysée du/)).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proposition calorique', exact: true }))
    .toHaveCount(0);
  await expect(page.getByText(/coachState:/)).toHaveCount(0);
  await expect(page.getByText(/strengthContext:/)).toHaveCount(0);

  await page.getByText('Détails du suivi hebdomadaire', { exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Résumé de la semaine', exact: true }))
    .toBeVisible();
  await expect(page.getByText('Fenêtre de 21 jours', { exact: true })).toBeVisible();

  await expect(page.getByText('Diagnostic du moteur énergétique', { exact: true }))
    .toBeVisible();
  await page.getByText('Diagnostic du moteur énergétique', { exact: true }).click();
  await expect(page.getByText('Comparaison encore impossible')).toBeVisible();
  await expect(page.getByText('Il ne déclenche jamais une correction.', { exact: false }))
    .toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
