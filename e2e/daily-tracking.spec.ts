import { expect, test } from '@playwright/test';
import { createLocalProfile } from './helpers/app';

test('enregistre les pas et le poids depuis le tableau de bord', async ({ page }) => {
  await createLocalProfile(page);

  await page.getByRole('button', { name: 'Faire le check-in' }).click();
  const checkIn = page.getByRole('dialog', { name: 'Check-in du matin' });
  const weightInput = checkIn.getByLabel('Poids');
  let weightAccepted = false;
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    await weightInput.fill('69.4');
    try {
      await expect(weightInput).toHaveValue('69.4', { timeout: 1_000 });
      weightAccepted = true;
      break;
    } catch (error) {
      if (attempt === 3) throw error;
      await page.waitForTimeout(100);
    }
  }
  expect(weightAccepted).toBe(true);
  await checkIn.getByRole('button', { name: 'Enregistrer le check-in' }).click();
  await expect(page.getByRole('button', { name: 'Modifier le check-in' })).toBeVisible();

  await page.getByRole('button', { name: 'Clôturer la journée' }).click();
  const checkOut = page.getByRole('dialog', { name: 'Check-out du soir' });
  await checkOut.getByText('Confirmer', { exact: true }).click();
  await checkOut.getByLabel('Pas totaux').fill('12500');
  await checkOut.getByRole('button', { name: 'Clôturer la journée' }).click();
  await expect(page.getByText('Bilan de la journée disponible')).toBeVisible();

  await page.goto('/#/weight');
  await expect(page.getByRole('button', { name: /69[,.]4 kg/ })).toBeVisible();
});
