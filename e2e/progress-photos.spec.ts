import { expect, test, type Page } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
  expectPageAccessibilityBaseline,
  getBrowserLocalDate,
} from './helpers/app';

const TEST_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAIAAAAlC+aJAAAAY0lEQVR4nO3PQQ3AIADAQEAQD/zhfSJ4XJb0FLRz3zP+bOmAVw1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oDWgNaA1oH+jdAV0p1pCYAAAAAElFTkSuQmCC',
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
    name: string;
    note: string;
    expectedCount: number;
  },
): Promise<void> {
  await page.getByLabel('Choisir une photo de progression').setInputFiles({
    name: options.name,
    mimeType: 'image/png',
    buffer: TEST_PNG,
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
    name: 'progression-face.png',
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
    name: 'avant.png',
    note: 'Avant.',
    expectedCount: 1,
  });
  await addPhoto(page, {
    date: await getBrowserLocalDate(page),
    name: 'apres.png',
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
