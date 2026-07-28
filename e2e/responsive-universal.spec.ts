import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectEssentialContentVisible,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

const primaryRoutes = ['/', '/food', '/activities', '/progression'] as const;

test('conserve les contenus essentiels sur la matrice responsive', async ({ page }) => {
  await createLocalProfile(page, 'Responsive');

  for (const route of primaryRoutes) {
    await page.goto(`/#${route}`);
    await expectNoCriticalHorizontalOverflow(page);
    await expectEssentialContentVisible(page);
  }

  const navigation = page.getByRole('navigation', {
    name: (page.viewportSize()?.width ?? 0) >= 1024
      ? 'Navigation principale'
      : 'Navigation mobile',
  });
  await expect(navigation.getByRole('link')).toHaveCount(4);
  await expect(navigation.getByRole('link', { name: 'Progression' })).toBeVisible();
});

test('reste utilisable avec un texte système agrandi', async ({ page }) => {
  await createLocalProfile(page, 'Texte agrandi');
  await page.addStyleTag({
    content: `
      @media (max-width: 63.999rem) {
        html { font-size: 125% !important; }
      }
    `,
  });

  await page.goto('/#/');
  await expectNoCriticalHorizontalOverflow(page);
  await expectEssentialContentVisible(page);
  await expect(page.getByRole('button', { name: 'Ajouter un repas' })).toBeVisible();
});

test('garde le statut et le switch IA séparés sur petit écran', async ({ page }) => {
  await createLocalProfile(page, 'Photo responsive');
  await page.goto('/#/food/photo-estimate?date=2026-07-28&slot=lunch');

  const label = page.getByText('Analyse IA', { exact: true });
  const status = page.getByText('Désactivée', { exact: true });
  const toggle = page.getByRole('switch', { name: 'Activer l’analyse IA pour cette photo' });
  const track = page.getByTestId('photo-ai-switch-track');
  const thumb = page.getByTestId('photo-ai-switch-thumb');
  await expect(label).toBeVisible();
  await expect(status).toBeVisible();
  await expect(toggle).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  const statusBox = await status.boundingBox();
  const toggleBox = await toggle.boundingBox();
  expect(statusBox).not.toBeNull();
  expect(toggleBox).not.toBeNull();
  expect(statusBox!.x + statusBox!.width).toBeLessThanOrEqual(toggleBox!.x);

  const disabledTrackBox = await track.boundingBox();
  const disabledThumbBox = await thumb.boundingBox();
  expect(disabledTrackBox).not.toBeNull();
  expect(disabledThumbBox).not.toBeNull();
  expect(disabledTrackBox!.width).toBeCloseTo(48, 0);
  expect(disabledTrackBox!.height).toBeCloseTo(28, 0);
  expect(disabledThumbBox!.width).toBeCloseTo(22, 0);
  expect(disabledThumbBox!.x).toBeCloseTo(disabledTrackBox!.x + 3, 0);
  expect(disabledThumbBox!.x).toBeGreaterThanOrEqual(disabledTrackBox!.x);

  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Activée', { exact: true })).toBeVisible();
  await expect.poll(async () => {
    const currentTrack = await track.boundingBox();
    const currentThumb = await thumb.boundingBox();
    if (!currentTrack || !currentThumb) return -1;
    return Math.round(
      currentTrack.x + currentTrack.width
      - (currentThumb.x + currentThumb.width),
    );
  }).toBe(3);

  const enabledTrackBox = await track.boundingBox();
  const enabledThumbBox = await thumb.boundingBox();
  expect(enabledTrackBox).not.toBeNull();
  expect(enabledThumbBox).not.toBeNull();
  expect(enabledThumbBox!.x + enabledThumbBox!.width)
    .toBeCloseTo(enabledTrackBox!.x + enabledTrackBox!.width - 3, 0);
  expect(enabledThumbBox!.x + enabledThumbBox!.width)
    .toBeLessThanOrEqual(enabledTrackBox!.x + enabledTrackBox!.width);

  await toggle.press('Space');
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
});

test('crée un exercice depuis une recherche vide puis revient à la bibliothèque', async ({
  page,
}, testInfo) => {
  await createLocalProfile(page, 'Création exercice');
  await page.goto('/#/strength/exercises');

  const exerciseName = `Tirage E2E ${testInfo.project.name}`;
  const search = page.getByRole('searchbox', { name: 'Rechercher un exercice' });
  await search.fill(exerciseName);

  await expect(
    page.getByText(`Aucun exercice trouvé pour « ${exerciseName} »`),
  ).toBeVisible();
  await page.getByRole('link', { name: 'Créer cet exercice' }).click();

  const nameInput = page.getByLabel(/Nom de l’exercice/);
  await expect(nameInput).toHaveValue(exerciseName);
  await expectNoCriticalHorizontalOverflow(page);
  await page.getByRole('button', { name: 'Créer l’exercice' }).click();

  await expect(page).toHaveURL(/#\/strength\/exercises/);
  await expect(page.getByText(exerciseName, { exact: true })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
