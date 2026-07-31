import { expect, test, type Page } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
  expectPageAccessibilityBaseline,
  getBrowserLocalDate,
} from './helpers/app';

const TEST_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAUDBAQEAwUEBAQFBQUGBwwIBwcHBw8LCwkMEQ8SEhEPERETFhwXExQaFRERGCEYGh0dHx8fExciJCIeJBweHx7/2wBDAQUFBQcGBw4ICA4eFBEUHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh4eHh7/wAARCABAAEADAREAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDq6+EPvjgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xOCr9zPw472vww/cTgq/cz8OCgDva/DD9xOCr9zPw472vww/cTgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xCgDgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xOCr9zPw472vww/cTgq/cz8OCgDva/DD9xOCr9zPw472vww/cTgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xCgDgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xOCr9zPw472vww/cTgq/cz8OCgDva/DD9xOCr9zPw472vww/cTgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xCgDgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xOCr9zPw472vww/cTgq/cz8OCgDva/DD9xOCr9zPw472vww/cTgq/cz8OO9r8MP3E4Kv3M/Djva/DD9xP/9k=',
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
    name: 'progression-face.jpg',
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
    name: 'avant.jpg',
    note: 'Avant.',
    expectedCount: 1,
  });
  await addPhoto(page, {
    date: await getBrowserLocalDate(page),
    name: 'apres.jpg',
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
