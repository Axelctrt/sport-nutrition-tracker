import { expect, test } from '@playwright/test';

import { createLocalProfile, expectNoCriticalHorizontalOverflow } from './helpers/app';

test('navigue entre les quatre rubriques Amis sans empiler leur contenu', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/friends');

  await expect(page.getByRole('heading', { name: 'Amis', level: 1 })).toBeVisible();
  const feedPanel = page.locator('#friends-panel-feed');
  const friendsPanel = page.locator('#friends-panel-friends');
  const requestsPanel = page.locator('#friends-panel-requests');
  const profilePanel = page.locator('#friends-panel-profile');

  await expect(feedPanel).toBeVisible();
  await expect(friendsPanel).toBeHidden();
  await expect(requestsPanel).toBeHidden();
  await expect(profilePanel).toBeHidden();

  await page.getByRole('button', { name: 'Demandes d’amis' }).click();
  await expect(page).toHaveURL(/#\/friends\?section=requests$/);
  await expect(requestsPanel).toBeVisible();
  await expect(feedPanel).toBeHidden();

  await page.getByRole('button', { name: 'Mon profil social' }).click();
  await expect(page).toHaveURL(/#\/friends\?section=profile$/);
  await expect(profilePanel).toBeVisible();
  await expect(requestsPanel).toBeHidden();
  await expect(profilePanel.getByRole('heading', { name: 'Profil', level: 2 })).toBeVisible();
  await expect(profilePanel.getByRole('radio', { name: 'Visible par les amis' })).toBeChecked();
  await expect(profilePanel.getByRole('button', { name: 'Copier l’identifiant public' })).toBeVisible();
  await expect(profilePanel.getByRole('button', { name: /Vérifier disponibilité/u })).toHaveCount(0);

  const publicHandle = profilePanel.getByRole('textbox', { name: 'Identifiant public' });
  const saveIdentity = profilePanel.getByRole('button', { name: 'Enregistrer' });
  await publicHandle.fill('@x');
  await expect(profilePanel.getByRole('alert')).toContainText('Identifiant invalide');
  await expect(saveIdentity).toBeDisabled();
  await publicHandle.fill('@profil.disponible');
  await expect(profilePanel.getByRole('status')).toContainText('Vérification…');
  await expect(saveIdentity).toBeDisabled();

  const profileLabel = page.getByRole('button', { name: 'Mon profil social' })
    .getByText('Profil', { exact: true });
  await expect(profileLabel).toBeVisible();

  for (const width of [320, 360, 393, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoCriticalHorizontalOverflow(page);
    const metrics = await profileLabel.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(style.lineHeight),
      };
    });
    expect(metrics.height).toBeLessThan(metrics.lineHeight * 1.5);
  }
});
