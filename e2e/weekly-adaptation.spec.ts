import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('explique le bilan adaptatif sans débordement sur iPhone 15', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'webkit-iphone-15',
    'Ce parcours cible le viewport mobile WebKit de l’iPhone 15.',
  );

  await createLocalProfile(page, 'Adaptation E2E');
  await page.goto('/#/weekly-review');

  await expect(page.getByRole('heading', { level: 1, name: 'Bilan hebdomadaire' }))
    .toBeVisible();
  await expect(page.getByRole('heading', { level: 2, name: 'Données insuffisantes' }))
    .toBeVisible();
  await expect(page.getByText('Fenêtre de 21 jours')).toBeVisible();
  await expect(page.getByText('Pourquoi la cible reste inchangée')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Proposition calorique' })).toBeVisible();
  await expect(page.getByRole('button', { name: /Accepter|Confirmer/ })).toHaveCount(0);
  await expect(page.getByText('Diagnostic du moteur énergétique', { exact: true }))
    .toBeVisible();
  await page.getByText('Diagnostic du moteur énergétique', { exact: true }).click();
  await expect(page.getByText('Comparaison encore impossible')).toBeVisible();
  await expect(page.getByText('Il ne déclenche jamais une correction.', { exact: false }))
    .toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
