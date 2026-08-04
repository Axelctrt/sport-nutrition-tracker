import { expect, test } from '@playwright/test';

import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('édite le profil social depuis sa carte en lecture seule et restaure le focus', async ({ page }, testInfo) => {
  await createLocalProfile(page);
  await page.goto('/#/friends');
  await page.getByRole('button', { name: 'Mon profil social' }).click();

  const socialCard = page.getByLabel('Profil social', { exact: true });
  const editProfile = socialCard.getByRole('button', { name: 'Modifier le profil public' });
  await expect(socialCard).toBeVisible();
  await expect(editProfile).toBeVisible();
  await expect(editProfile).toHaveText(/Modifier/);
  await expect(page.getByRole('textbox', { name: 'Identifiant public' })).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);

  const cardBox = await socialCard.boundingBox();
  const editBox = await editProfile.boundingBox();
  expect(cardBox).not.toBeNull();
  expect(editBox).not.toBeNull();
  if (!cardBox || !editBox) throw new Error('La carte Profil social ou son bouton Modifier n’est pas mesurable.');
  expect(editBox.width).toBeGreaterThanOrEqual(96);
  expect(editBox.height).toBeGreaterThanOrEqual(44);
  expect((cardBox.x + cardBox.width) - (editBox.x + editBox.width)).toBeLessThanOrEqual(32);
  expect(editBox.y - cardBox.y).toBeLessThanOrEqual(32);

  await page.screenshot({ path: testInfo.outputPath('profil-social-lecture-seule.png'), fullPage: true });

  await editProfile.click();
  const editor = page.getByRole('dialog', { name: 'Modifier le profil public' });
  const handle = page.getByRole('textbox', { name: 'Identifiant public' });
  const copyButton = page.getByRole('button', { name: 'Copier l’identifiant public' });
  const status = page.locator('#social-handle-status');
  await expect(editor).toBeVisible();
  await expect(page.locator('.sp-bottom-sheet-backdrop')).toHaveClass(/backdrop-blur/);
  await expect(handle).toBeFocused();
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Annuler' })).toBeVisible();
  await expect(handle.locator('xpath=..').getByRole('button', { name: 'Copier l’identifiant public' })).toBeVisible();
  await expect(status).toBeVisible();
  await expect(status).toHaveText(/Identifiant actuel/);

  const inputBox = await handle.boundingBox();
  const copyBox = await copyButton.boundingBox();
  const statusBox = await status.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(copyBox).not.toBeNull();
  expect(statusBox).not.toBeNull();
  if (!inputBox || !copyBox || !statusBox) throw new Error('Les contrôles du profil social ne sont pas mesurables.');
  expect(copyBox.x).toBeGreaterThanOrEqual(inputBox.x + inputBox.width - 1);
  const inputBottom = inputBox.y + inputBox.height;
  const statusCenter = statusBox.y + statusBox.height / 2;
  expect(statusCenter).toBeGreaterThanOrEqual(inputBottom);

  await page.screenshot({ path: testInfo.outputPath('profil-social-edition.png'), fullPage: true });

  await page.getByRole('button', { name: 'Annuler' }).click();
  await expect(editor).toHaveCount(0);
  await expect(editProfile).toBeFocused();

  await editProfile.click();
  const displayName = page.getByLabel('Nom affiché');
  await displayName.fill('Profil social mobile');
  await page.getByRole('button', { name: 'Annuler' }).click();
  const discardDialog = page.getByRole('alertdialog', { name: 'Annuler les modifications ?' });
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button', { name: 'Continuer la modification' }).click();
  await expect(displayName).toHaveValue('Profil social mobile');
  await page.getByRole('button', { name: 'Annuler' }).click();
  await discardDialog.getByRole('button', { name: 'Abandonner les modifications' }).click();
  await expect(editor).toHaveCount(0);
  await expect(editProfile).toBeFocused();

  await editProfile.click();
  await page.getByLabel('Nom affiché').fill('Profil social enregistré');
  await page.getByRole('button', { name: 'Enregistrer' }).click();
  await expect(editor).toHaveCount(0);
  await expect(page.getByText('Profil mis à jour')).toHaveCount(1);
  await expect(page.getByText('Action prise en compte')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
  await expect(editProfile).toBeFocused();
  await expectNoCriticalHorizontalOverflow(page);
});
