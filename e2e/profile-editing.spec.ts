import { expect, test } from '@playwright/test';

import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('active explicitement la modification du profil depuis le crayon de la carte et restaure le focus', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/profile');

  await expect(page.getByRole('heading', { name: 'Profil et objectif nutritionnel', level: 1 })).toBeVisible();
  const profileCard = page.getByLabel('Résumé du profil');
  const editProfile = profileCard.getByRole('button', { name: 'Modifier le profil' });
  await expect(profileCard).toBeVisible();
  await expect(editProfile).toBeVisible();
  await expect(editProfile).toHaveText(/Modifier/);
  await expect(page.getByRole('button', { name: 'Modifier le profil' })).toHaveCount(1);
  await expect(page.getByLabel('Prénom')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enregistrer le profil' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Annuler' })).toHaveCount(0);

  const cardBox = await profileCard.boundingBox();
  const editBox = await editProfile.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(editBox).not.toBeNull();
  if (!cardBox || !editBox) throw new Error('La carte Profil ou son crayon n’est pas mesurable.');
  expect(editBox.width).toBeGreaterThanOrEqual(96);
  expect(editBox.height).toBeGreaterThanOrEqual(44);
  expect((cardBox.x + cardBox.width) - (editBox.x + editBox.width)).toBeLessThanOrEqual(32);
  expect(editBox.y - cardBox.y).toBeLessThanOrEqual(32);

  await editProfile.click();
  await expect(page.getByRole('dialog', { name: 'Modifier le profil' })).toBeVisible();
  await expect(page.locator('.sp-bottom-sheet-backdrop')).toHaveClass(/backdrop-blur/);
  const firstName = page.getByLabel('Prénom');
  await expect(firstName).toBeVisible();
  await expect(firstName).toBeFocused();
  await expect(page.getByRole('button', { name: 'Enregistrer le profil' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler' })).toBeVisible();

  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(firstName).toHaveCount(0);
  await expect(editProfile).toBeFocused();

  await editProfile.press('Enter');
  await expect(firstName).toBeFocused();
  await firstName.fill('Profil mobile modifié');
  await page.getByRole('button', { name: 'Annuler' }).click();
  const discardDialog = page.getByRole('alertdialog', { name: 'Annuler les modifications ?' });
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button', { name: 'Continuer la modification' }).click();
  await expect(firstName).toBeVisible();
  await page.getByRole('button', { name: 'Annuler' }).click();
  await discardDialog.getByRole('button', { name: 'Abandonner les modifications' }).click();
  await expect(firstName).toHaveCount(0);
  await expect(editProfile).toBeFocused();

  for (const width of [320, 360, 393, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoCriticalHorizontalOverflow(page);
    await expect(editProfile).toBeVisible();
  }
});
