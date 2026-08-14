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

  await page.getByRole('button', { name: 'Mes amis' }).click();
  await expect(page).toHaveURL(/#\/friends\?section=friends$/);
  await expect(friendsPanel).toBeVisible();
  await expect(feedPanel).toBeHidden();
  await expect(requestsPanel).toBeHidden();
  await expect(profilePanel).toBeHidden();

  await page.getByRole('button', { name: 'Demandes d’amis' }).click();
  await expect(page).toHaveURL(/#\/friends\?section=requests$/);
  await expect(requestsPanel).toBeVisible();
  await expect(feedPanel).toBeHidden();
  await expect(friendsPanel).toBeHidden();
  await expect(profilePanel).toBeHidden();

  await page.getByRole('button', { name: 'Mon profil social' }).click();
  await expect(page).toHaveURL(/#\/friends\?section=profile$/);
  await expect(profilePanel).toBeVisible();
  await expect(feedPanel).toBeHidden();
  await expect(friendsPanel).toBeHidden();
  await expect(requestsPanel).toBeHidden();

  const socialCard = profilePanel.getByLabel('Profil social', { exact: true });
  const editProfile = socialCard.getByRole('button', { name: 'Modifier le profil public' });
  const copyIdentity = socialCard.getByRole('button', { name: 'Copier l’identifiant public' });
  await expect(socialCard).toBeVisible();
  await expect(socialCard.getByRole('heading', { name: 'Profil social', level: 2, exact: true })).toBeVisible();
  await expect(socialCard.getByText('Visible par les amis', { exact: true })).toBeVisible();
  await expect(socialCard.getByText('Autorisées', { exact: true })).toBeVisible();
  await expect(editProfile).toBeVisible();
  await expect(editProfile).toHaveText(/Modifier/u);
  await expect(copyIdentity).toBeVisible();
  await expect(copyIdentity).toHaveText('');

  await expect(profilePanel.getByRole('textbox', { name: 'Identifiant public' })).toHaveCount(0);
  await expect(profilePanel.getByRole('radio')).toHaveCount(0);
  await expect(profilePanel.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0);
  await expect(profilePanel.getByRole('button', { name: /Vérifier disponibilité/u })).toHaveCount(0);
  await expect(profilePanel.getByRole('button', { name: /^Copier$/u })).toHaveCount(0);

  const profileLabel = page.getByRole('button', { name: 'Mon profil social' })
    .getByText('Profil', { exact: true });
  await expect(profileLabel).toBeVisible();

  for (const width of [320, 360, 393, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoCriticalHorizontalOverflow(page);

    const copyBox = await copyIdentity.boundingBox();
    expect(copyBox?.width).toBeGreaterThanOrEqual(44);
    expect(copyBox?.height).toBeGreaterThanOrEqual(44);

    const editBox = await editProfile.boundingBox();
    expect(editBox?.height).toBeGreaterThanOrEqual(44);

    const metrics = await profileLabel.evaluate((element) => {
      const style = window.getComputedStyle(element);
      return {
        height: element.getBoundingClientRect().height,
        lineHeight: Number.parseFloat(style.lineHeight),
      };
    });
    expect(metrics.height).toBeLessThan(metrics.lineHeight * 1.5);
  }

  await page.evaluate(() => document.documentElement.classList.add('dark'));
  await expectNoCriticalHorizontalOverflow(page);
  await expect(socialCard).toBeVisible();
  await expect(editProfile).toBeVisible();
  await expect(copyIdentity).toBeVisible();
});
