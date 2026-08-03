import { expect, test } from '@playwright/test';

import { createLocalProfile } from './helpers/app';

test('affiche le crayon dans l’angle supérieur droit de la carte Profil', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/profile');

  const profileCard = page.getByLabel('Résumé du profil');
  const editProfile = profileCard.getByRole('button', { name: 'Modifier le profil' });
  await expect(profileCard).toBeVisible();
  await expect(editProfile).toBeVisible();
  await expect(page.getByLabel('Prénom')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enregistrer le profil' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Annuler' })).toHaveCount(0);

  const cardBox = await profileCard.boundingBox();
  const editBox = await editProfile.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(editBox).not.toBeNull();
  expect(editBox!.x).toBeGreaterThan(cardBox!.x + cardBox!.width / 2);
  expect(editBox!.y).toBeLessThan(cardBox!.y + 80);
  expect(editBox!.x + editBox!.width).toBeLessThanOrEqual(cardBox!.x + cardBox!.width);

  await editProfile.click();
  await expect(page.getByLabel('Prénom')).toBeFocused();
  await expect(page.getByRole('button', { name: 'Enregistrer le profil' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler' })).toBeVisible();

  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByLabel('Prénom')).toHaveCount(0);
  await expect(editProfile).toBeFocused();
});

test('confirme la visibilité par un toast unique sans texte vert persistant', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/friends');
  await page.getByRole('button', { name: 'Mon profil social' }).click();

  const profilePanel = page.locator('#friends-panel-profile');
  await expect(profilePanel).toBeVisible();
  await page.getByRole('radio', { name: 'Profil privé' }).click();

  const successToast = page.getByText('Visibilité du profil mise à jour', { exact: true });
  await expect(successToast).toBeVisible();
  await expect(successToast).toHaveCount(1);
  await expect(profilePanel.getByText('Action prise en compte')).toHaveCount(0);
  await expect(profilePanel.getByText(/Profil passé en privé/u)).toHaveCount(0);
});
