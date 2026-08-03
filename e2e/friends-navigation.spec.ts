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

  const publicHandle = profilePanel.getByRole('textbox', { name: 'Identifiant public' });
  const copyIdentity = profilePanel.getByRole('button', { name: 'Copier l’identifiant public' });
  const handleStatus = profilePanel.locator('#social-handle-status');
  const saveIdentity = profilePanel.getByRole('button', { name: 'Enregistrer' });
  await expect(copyIdentity).toBeVisible();
  await expect(copyIdentity).toHaveText('');
  await expect(profilePanel.getByRole('button', { name: /Vérifier disponibilité/u })).toHaveCount(0);
  await expect(profilePanel.getByRole('button', { name: /^Copier$/u })).toHaveCount(0);

  const privateVisibility = profilePanel.getByRole('radio', { name: 'Profil privé' });
  await privateVisibility.locator('..').click();
  await expect(privateVisibility).toBeChecked();
  const visibilitySuccessToast = page.getByRole('status').filter({
    hasText: 'Visibilité du profil mise à jour',
  });
  await expect(visibilitySuccessToast).toHaveCount(1);
  await expect(page.getByText('Action prise en compte', { exact: true })).toHaveCount(0);
  await expect(page.getByText(/Profil passé en privé/u)).toHaveCount(0);

  const order = await profilePanel.evaluate((panel) => {
    const input = panel.querySelector('#social-handle');
    const copy = panel.querySelector('[aria-label="Copier l’identifiant public"]');
    const status = panel.querySelector('#social-handle-status');
    const save = Array.from(panel.querySelectorAll('button')).find((button) => button.textContent?.trim() === 'Enregistrer');
    return {
      sameControlRow: Boolean(input && copy && input.parentElement === copy.parentElement),
      statusAfterControl: Boolean(input?.parentElement && status && (input.parentElement.compareDocumentPosition(status) & Node.DOCUMENT_POSITION_FOLLOWING)),
      saveAfterStatus: Boolean(status && save && (status.compareDocumentPosition(save) & Node.DOCUMENT_POSITION_FOLLOWING)),
    };
  });
  expect(order).toEqual({
    sameControlRow: true,
    statusAfterControl: true,
    saveAfterStatus: true,
  });

  await publicHandle.fill('@x');
  await expect(profilePanel.getByRole('alert')).toContainText('Identifiant invalide');
  await expect(profilePanel.locator('[data-field-status-icon="invalid"]')).toBeVisible();
  await expect(publicHandle).toHaveAttribute('aria-invalid', 'true');
  await expect(saveIdentity).toBeDisabled();

  await publicHandle.fill('@profil.disponible');
  await expect(profilePanel.getByRole('status')).toContainText('Vérification…');
  await expect(profilePanel.locator('[data-field-status-icon="checking"]')).toBeVisible();
  await expect(saveIdentity).toBeDisabled();

  const profileLabel = page.getByRole('button', { name: 'Mon profil social' })
    .getByText('Profil', { exact: true });
  await expect(profileLabel).toBeVisible();

  for (const width of [320, 360, 393, 412]) {
    await page.setViewportSize({ width, height: 844 });
    await expectNoCriticalHorizontalOverflow(page);
    const copyBox = await copyIdentity.boundingBox();
    expect(copyBox?.width).toBeGreaterThanOrEqual(44);
    expect(copyBox?.height).toBeGreaterThanOrEqual(44);
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
  await expect(handleStatus).toBeVisible();
});
