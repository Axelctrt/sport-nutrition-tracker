import { expect, test, type Locator } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

async function expectSheetActionInsideVisualViewport(
  dialog: Locator,
  buttonName: string,
) {
  await dialog.evaluate(async (element) => {
    await Promise.all(
      element.getAnimations().map((animation) => animation.finished.catch(() => undefined)),
    );
  });
  const geometry = await dialog.evaluate((element, name) => {
    const button = Array.from(element.querySelectorAll('button'))
      .find((candidate) => candidate.textContent?.includes(name));
    const footer = element.querySelector<HTMLElement>('[data-bottom-sheet-footer]');
    const content = element.querySelector<HTMLElement>('[data-bottom-sheet-content]');
    if (!button || !footer || !content) {
      throw new Error('Structure BottomSheet incomplète.');
    }
    const viewport = window.visualViewport;
    const viewportTop = viewport?.offsetTop ?? 0;
    const viewportBottom = viewportTop + (viewport?.height ?? window.innerHeight);
    const dialogRect = element.getBoundingClientRect();
    const footerRect = footer.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();

    return {
      viewportTop,
      viewportBottom,
      dialogTop: dialogRect.top,
      dialogBottom: dialogRect.bottom,
      footerTop: footerRect.top,
      footerBottom: footerRect.bottom,
      buttonTop: buttonRect.top,
      buttonBottom: buttonRect.bottom,
      footerPaddingBottom: Number.parseFloat(getComputedStyle(footer).paddingBottom),
      contentScrollable: content.scrollHeight > content.clientHeight,
    };
  }, buttonName);

  expect(geometry.dialogTop).toBeGreaterThanOrEqual(geometry.viewportTop - 1);
  expect(geometry.dialogBottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.footerBottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.buttonBottom).toBeLessThanOrEqual(geometry.viewportBottom + 1);
  expect(geometry.buttonTop).toBeGreaterThanOrEqual(geometry.footerTop);
  expect(geometry.footerPaddingBottom).toBeGreaterThanOrEqual(12);
  expect(geometry.contentScrollable).toBe(true);
}

test('guide le check-in quotidien sans débordement mobile', async ({ page }) => {
  await createLocalProfile(page, 'Assistant E2E');

  await expect(page.getByRole('heading', { name: 'Assistant du jour' })).toBeVisible();
  await expect(page.getByText('Cible alimentaire guidée')).toBeVisible();
  await expect(page.getByText('Pas attendus')).toBeVisible();
  await expect(page.getByRole('progressbar', { name: 'Progression de la journée' }))
    .toHaveAttribute('aria-valuenow', '0');
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Faire le check-in' }).click();

  const dialog = page.getByRole('dialog', { name: 'Check-in du matin' });
  const saveButton = dialog.getByRole('button', { name: 'Enregistrer le check-in' });
  await expect(dialog).toBeVisible();
  await expect(saveButton).toBeVisible();
  await expect(page.getByRole('button', { name: 'Fermer', exact: true })).toBeFocused();
  await expectSheetActionInsideVisualViewport(dialog, 'Enregistrer le check-in');

  const dialogBounds = await dialog.evaluate((element) => {
    const rect = element.getBoundingClientRect();
    return {
      left: rect.left,
      right: rect.right,
      viewportWidth: window.visualViewport?.width ?? window.innerWidth,
    };
  });
  expect(dialogBounds.left).toBeGreaterThanOrEqual(0);
  expect(dialogBounds.right).toBeLessThanOrEqual(dialogBounds.viewportWidth + 1);

  const handle = dialog.locator('[data-bottom-sheet-drag-handle]');
  const handleBounds = await handle.boundingBox();
  if (!handleBounds) throw new Error('Poignée du panneau introuvable.');
  const handleX = handleBounds.x + handleBounds.width / 2;
  const handleY = handleBounds.y + handleBounds.height / 2;
  await page.mouse.move(handleX, handleY);
  await page.mouse.down();
  await page.mouse.move(handleX, handleY + 20, { steps: 4 });
  await page.mouse.up();
  await expect(dialog).toBeVisible();

  const currentHandleBounds = await handle.boundingBox();
  if (!currentHandleBounds) throw new Error('Poignée du panneau introuvable.');
  await page.mouse.move(
    currentHandleBounds.x + currentHandleBounds.width / 2,
    currentHandleBounds.y + currentHandleBounds.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(handleX, handleY + 140, { steps: 8 });
  await page.mouse.up();
  await expect(dialog).toBeHidden();

  await page.getByRole('button', { name: 'Faire le check-in' }).click();
  await page.getByLabel('Poids').focus();
  await page.setViewportSize({ width: 393, height: 430 });
  await expectSheetActionInsideVisualViewport(dialog, 'Enregistrer le check-in');

  await dialog.getByRole('radio', { name: 'Pas aujourd’hui' }).click();
  await saveButton.click();

  await expect(dialog).toBeHidden();
  await expect(page.getByText('1 étape sur 4')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Modifier le check-in' })).toBeVisible();

  await page.getByRole('button', { name: 'Clôturer la journée' }).click();
  const checkOutDialog = page.getByRole('dialog', { name: 'Check-out du soir' });
  await expect(checkOutDialog).toBeVisible();
  await expectSheetActionInsideVisualViewport(checkOutDialog, 'Clôturer la journée');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  expect(await checkOutDialog.evaluate((element) => (
    Number.parseFloat(getComputedStyle(element).transitionDuration)
  ))).toBeLessThanOrEqual(0.001);
  await checkOutDialog.getByRole('button', { name: 'Fermer' }).click();
  await expect(checkOutDialog).toBeHidden();
  await expectNoCriticalHorizontalOverflow(page);
});

test('centralise les actions sport et nutrition dans le cœur fixe de l’accueil', async ({ page }) => {
  await createLocalProfile(page, 'Accueil quotidien E2E');

  const fixedWidgets = await page.locator('[data-dashboard-fixed-widget]').evaluateAll(
    (elements) => elements.map((element) => element.getAttribute('data-dashboard-fixed-widget')),
  );
  expect(fixedWidgets).toEqual(['todaySummary', 'dailyAssistant']);
  await expect(page.locator('[data-dashboard-widget="quickActions"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Prévoir une activité' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Musculation' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Prévoir une activité' }).click();
  const sportDialog = page.getByRole('dialog', { name: 'Prévoir une activité' });
  await sportDialog.getByText('Marche', { exact: true }).click();
  await sportDialog.getByText('Marche active', { exact: true }).click();
  await sportDialog.getByRole('button', { name: 'Continuer' }).click();
  await sportDialog.getByRole('button', { name: 'Planifier pour aujourd’hui' }).click();

  await expect(sportDialog).toBeHidden();
  await expect(page.getByText('Marche active', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Démarrer' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Prévoir une autre activité' })).toBeVisible();

  await expect(page.getByRole('link', { name: 'Scanner', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Journal', exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Ajouter un repas' }).click();

  const nutritionDialog = page.getByRole('dialog', { name: 'Ajouter un repas' });
  const selectedMeal = nutritionDialog.getByRole('radio', { checked: true });
  await expect(selectedMeal).toHaveCount(1);
  const selectedSlot = await selectedMeal.getAttribute('value');
  const selectedMealLabel = {
    breakfast: 'Petit-déjeuner',
    lunch: 'Déjeuner',
    dinner: 'Dîner',
    snacks: 'Collations',
  }[selectedSlot ?? ''];
  expect(selectedMealLabel).toBeTruthy();
  await selectedMeal.locator('..').click();
  await expect(nutritionDialog.getByRole('button', { name: 'Terminer le repas' })).toBeVisible();
  await nutritionDialog.getByRole('button', { name: 'Ajouter un élément' }).click();
  await expect(nutritionDialog.getByRole('button', { name: /Rechercher un aliment/ })).toBeVisible();
  await expect(nutritionDialog.getByRole('link', { name: /Scanner un produit/ })).toBeVisible();
  await expect(nutritionDialog.getByRole('link', { name: /Photo du repas/ })).toBeVisible();
  await expect(nutritionDialog.getByRole('link', { name: /Utiliser une recette/ })).toBeVisible();

  await nutritionDialog.getByRole('link', { name: /Scanner un produit/ }).click();
  await expect(page).toHaveURL(/#\/food\/barcode-scanner\?/);
  await page.goBack();
  await expect(page).toHaveURL(/#\/\?panel=meal-add&slot=.*&step=method/);
  await expect(page.getByRole('dialog', { name: 'Ajouter un repas' })).toBeVisible();
  await expect(
    page.getByRole('dialog', { name: 'Ajouter un repas' })
      .getByRole('link', { name: /Scanner un produit/ }),
  ).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});
