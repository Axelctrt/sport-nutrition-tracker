import { expect, type Page } from '@playwright/test';

export async function createLocalProfile(page: Page, firstName = 'E2E'): Promise<void> {
  await page.goto('/#/onboarding');
  await expect(page.getByRole('heading', { name: 'Créer le profil local' })).toBeVisible();
  await page.getByLabel('Prénom').fill(firstName);
  await page.getByRole('button', { name: 'Créer mon profil' }).click();
  await expect(page.getByRole('heading', { name: `Bonjour ${firstName}` })).toBeVisible();
}

export async function expectNoCriticalHorizontalOverflow(page: Page): Promise<void> {
  const overflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(overflow).toBeLessThanOrEqual(1);
}

export async function getBrowserLocalDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const now = new Date();
    const pad = (value: number) => String(value).padStart(2, '0');

    return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  });
}
