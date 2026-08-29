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
  await expect(page.getByText('Maintien', { exact: true })).toBeVisible();
  await expect(page.getByText('Phase Coach', { exact: true })).toBeVisible();
  await expect(page.getByText('Stabilisation', { exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Plan actuel' })).toBeVisible();
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

  await page.getByRole('link', { name: 'Ouvrir le Bilan' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Bilan du Coach' })).toBeVisible();

  await page.goBack();
  await expect(page.getByRole('heading', { level: 1, name: 'Coach' })).toBeVisible();
  await expect(page.getByText('Maintien', { exact: true })).toBeVisible();
  await expect(page.getByText('Stabilisation', { exact: true })).toBeVisible();
  await expect(page.getByText(stepGoalText!, { exact: true })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
