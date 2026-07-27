import { expect, test } from '@playwright/test';
import { createLocalProfile, expectPageAccessibilityBaseline } from './helpers/app';

test('crée un profil local, le conserve et recharge une route directe', async ({ page }) => {
  await createLocalProfile(page, 'Axel E2E');

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Bonjour Axel E2E' })).toBeVisible();

  await page.goto('/#/activities');
  await expect(page.getByRole('heading', { name: 'Sport', exact: true })).toBeVisible();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('heading', { name: 'Sport', exact: true })).toBeVisible();
  await expectPageAccessibilityBaseline(page, { expectedHeading: 'Sport', checkShellTouchTargets: true });
});

test('utilise la navigation principale sur iPhone', async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== 'webkit-iphone-15', 'Parcours réservé au projet mobile WebKit.');
  await createLocalProfile(page);

  const navigation = page.getByRole('navigation', { name: 'Navigation mobile' });
  await navigation.getByRole('link', { name: 'Nutrition' }).click();
  await expect(page.getByRole('heading', { name: 'Nutrition', exact: true })).toBeVisible();

  await navigation.getByRole('link', { name: 'Sport' }).click();
  await expect(page.getByRole('heading', { name: 'Sport', exact: true })).toBeVisible();
  await expectPageAccessibilityBaseline(page, { expectedHeading: 'Sport', checkShellTouchTargets: true });
});
