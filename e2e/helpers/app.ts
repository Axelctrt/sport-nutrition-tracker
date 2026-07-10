import { expect, type Page } from '@playwright/test';

export async function createLocalProfile(page: Page, firstName = 'E2E'): Promise<void> {
  await page.goto('/#/onboarding');
  await expect(page.getByRole('heading', { name: 'Choisir le mode local ou compte' })).toBeVisible();
  await page.getByRole('button', { name: 'Choisir le mode local' }).click();
  await expect(page.getByRole('heading', {
    name: 'Comment souhaitez-vous être appelé dans SportPilot ?',
  })).toBeVisible();
  await page.getByLabel(/Nom utilisé dans SportPilot/).fill(firstName);

  const profileStepHeadings = [
    'Quel sexe doit être utilisé pour les calculs énergétiques ?',
    'Quelle est votre date de naissance ?',
    'Quelle est votre taille ?',
    'Quel est votre poids actuel ?',
    'Quel est votre objectif principal ?',
    'À quoi ressemble votre activité professionnelle ?',
    'Quel objectif de pas souhaitez-vous viser chaque jour ?',
  ];

  for (const heading of profileStepHeadings) {
    await page.getByRole('button', { name: 'Suivant' }).click();
    await expect(page.getByRole('heading', { name: heading })).toBeVisible();
  }

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
