import { expect, test } from '@playwright/test';
import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('agrège le plan Coach, sa phase et ouvre le Bilan sans perte d’état', async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== 'webkit-iphone-15',
    'Ce parcours cible le Hub Coach mobile sur iPhone 15.',
  );

  await createLocalProfile(page, 'Coach C6 E2E');
  await page.goto('/#/coach');

  await expect(page.getByRole('heading', { level: 1, name: 'Coach' })).toBeVisible();
  const objectiveCard = page.getByLabel('Maintien', { exact: true });
  await expect(objectiveCard.getByText('Maintien', { exact: true })).toBeVisible();
  await expect(objectiveCard.getByText('Phase Coach', { exact: true })).toBeVisible();
  await expect(objectiveCard.getByText('Stabilisation', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Plan actuel' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Historique des décisions' })).toBeVisible();
  await expect(page.getByText('Aucune décision Coach mémorisée pour le moment.')).toBeVisible();
  const stepGoal = page
    .getByRole('heading', { name: 'Activité', exact: true })
    .locator('..')
    .getByText(/^\d[\d\s]* pas$/);
  await expect(stepGoal).toBeVisible();
  const stepGoalText = await stepGoal.textContent();
  expect(stepGoalText).not.toBeNull();
  await expect(page.getByText('Effectue ton check-in pour obtenir ton verdict du jour.'))
    .toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Comprendre cette décision' }).click();
  const explanationDialog = page.getByRole('dialog', { name: 'Comprendre la décision' });
  await expect(explanationDialog).toBeVisible();
  await expect(explanationDialog.getByRole('heading', { name: 'Pourquoi cette décision ?' }))
    .toBeVisible();
  await expect(explanationDialog.getByRole('heading', { name: 'Qu’est-ce qui a changé ?' }))
    .toBeVisible();
  await expect(explanationDialog.getByRole('heading', { name: 'Que dois-je surveiller ?' }))
    .toBeVisible();
  const explanationBounds = await explanationDialog.boundingBox();
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(explanationBounds).not.toBeNull();
  expect(explanationBounds!.x).toBeGreaterThanOrEqual(0);
  expect(explanationBounds!.x + explanationBounds!.width).toBeLessThanOrEqual(viewportWidth + 1);
  await explanationDialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(explanationDialog).toBeHidden();

  await page.getByRole('link', { name: 'Ouvrir le Bilan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bilan du Coach' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Coach' })).toBeVisible();
  await expect(objectiveCard.getByText('Maintien', { exact: true })).toBeVisible();
  await expect(objectiveCard.getByText('Stabilisation', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Historique des décisions' })).toBeVisible();
  await expect(page.getByText(stepGoalText!, { exact: true })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
