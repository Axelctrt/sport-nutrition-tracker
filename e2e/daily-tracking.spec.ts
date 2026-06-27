import { expect, test } from '@playwright/test';
import { createLocalProfile } from './helpers/app';

test('enregistre les pas et le poids depuis le tableau de bord', async ({ page }) => {
  await createLocalProfile(page);

  const dashboard = page.getByRole('region', { name: 'Bonjour E2E' });

  await page.getByRole('button', { name: 'Saisir les pas' }).click();
  await page.getByRole('spinbutton', { name: /Pas totaux de la journée/ }).fill('12500');
  await page.getByRole('dialog', { name: 'Saisir les pas' })
    .getByRole('button', { name: 'Enregistrer' })
    .click();
  await expect(dashboard.getByRole('status')).toContainText('Pas enregistrés');

  await page.getByRole('button', { name: 'Saisir le poids' }).click();
  await page.getByRole('spinbutton', { name: /Poids en kilogrammes/ }).fill('69.4');
  await page.getByRole('dialog', { name: 'Saisir le poids' })
    .getByRole('button', { name: 'Enregistrer' })
    .click();
  await expect(dashboard.getByRole('status')).toContainText('Poids enregistré');

  await page.goto('/#/weight');
  await expect(page.getByRole('button', { name: /69[,.]4 kg/ })).toBeVisible();
});
