import { expect, test, type Page } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
  expectPageAccessibilityBaseline,
  getBrowserLocalDate,
} from './helpers/app';

const TEST_JPEG = Buffer.from(
  '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',
  'base64',
);

async function previousLocalDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  });
}

async function addPhoto(
  page: Page,
  options: {
    date: string;
    note: string;
    expectedCount: number;
  },
): Promise<void> {
  await page.getByLabel('Choisir une photo de progression').setInputFiles({
    name: 'progress-photo-test.jpg',
    mimeType: 'image/jpeg',
    buffer: TEST_JPEG,
  });
  await page.getByLabel('Date').fill(options.date);
  await page.getByLabel(/Note/).fill(options.note);
  await page.getByRole('button', { name: /Enregistrer la photo|Réessayer/ }).click();
  const countLabel = `${options.expectedCount} photo${options.expectedCount > 1 ? 's' : ''} · stockage restant estimé`;
  await expect(page.getByText(countLabel, { exact: false })).toBeVisible();
}

test('enregistre hors ligne et conserve les photos après rechargement', async ({ page, context }) => {
  await createLocalProfile(page, 'Photos locales');
  await page.goto('/#/progression/photos');
  await expectPageAccessibilityBaseline(page, {
    expectedHeading: 'Photos de progression',
    checkShellTouchTargets: true,
  });

  const apiRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/\/api\/|openfoodfacts|googleapis|gemini/i.test(url)) apiRequests.push(url);
  });

  await context.setOffline(true);
  await addPhoto(page, {
    date: await getBrowserLocalDate(page),
    note: 'Photo enregistrée hors ligne.',
    expectedCount: 1,
  });
  await expect(page.getByAltText(/Photo de progression face/)).toBeVisible();
  expect(apiRequests).toEqual([]);

  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText('1 photo · stockage restant estimé', { exact: false })).toBeVisible();
  await expect(page.getByAltText(/Photo de progression face/)).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});

test('compare deux dates de la même vue au toucher et au clavier', async ({ page }) => {
  await createLocalProfile(page, 'Comparaison photo');
  await page.goto('/#/progression/photos');

  await addPhoto(page, {
    date: await previousLocalDate(page),
    note: 'Avant.',
    expectedCount: 1,
  });
  await addPhoto(page, {
    date: await getBrowserLocalDate(page),
    note: 'Après.',
    expectedCount: 2,
  });

  const compareLink = page.getByRole('link', { name: 'Comparer' });
  await expect(compareLink).toHaveAttribute('aria-disabled', 'false');
  await compareLink.click();

  await expectPageAccessibilityBaseline(page, {
    expectedHeading: 'Comparer deux photos',
    checkShellTouchTargets: true,
  });
  const beforeSelect = page.getByRole('combobox', { name: 'Avant', exact: true });
  const afterSelect = page.getByRole('combobox', { name: 'Après', exact: true });
  await expect(page.getByLabel('Vue commune')).toHaveValue('front');
  await expect(beforeSelect).not.toHaveValue('');
  await expect(afterSelect).not.toHaveValue('');

  const separator = page.getByRole('slider', {
    name: 'Position du séparateur avant après',
  });
  await expect(separator).toHaveValue('50');
  await separator.focus();
  await page.keyboard.press('ArrowRight');
  await expect(separator).toHaveValue('51');

  const beforeValue = await beforeSelect.inputValue();
  const afterValue = await afterSelect.inputValue();
  await page.getByRole('button', { name: 'Inverser avant et après' }).click();
  await expect(beforeSelect).toHaveValue(afterValue);
  await expect(afterSelect).toHaveValue(beforeValue);
  await expectNoCriticalHorizontalOverflow(page);
});
