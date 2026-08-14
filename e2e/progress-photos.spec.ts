import {
  expect,
  test,
  type BrowserContext,
  type Page,
} from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
  expectPageAccessibilityBaseline,
  getBrowserLocalDate,
} from './helpers/app';

const TEST_JPEG = Buffer.from(
  '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',
  'base64',
);

async function previousLocalDate(page: Page): Promise<string> {
  return page.evaluate(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    const pad = (value: number) => String(value).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
  });
}

async function setPhotoTestOffline(
  page: Page,
  context: BrowserContext,
  browserName: string,
  offline: boolean,
): Promise<void> {
  if (browserName !== 'webkit') {
    await context.setOffline(offline);
    return;
  }

  // Playwright WebKit rend tout Blob/File illisible quand setOffline(true) est actif,
  // y compris un Blob mémoire sans réseau. Couper le transport et émettre l'état
  // navigateur conserve le parcours réellement local sans corrompre la fixture.
  if (offline) {
    await context.route('**/*', (route) => route.abort('internetdisconnected'));
    await page.evaluate(() => {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        get: () => false,
      });
      window.dispatchEvent(new Event('offline'));
    });
    return;
  }

  await context.unroute('**/*');
  await page.evaluate(() => {
    Reflect.deleteProperty(navigator, 'onLine');
    window.dispatchEvent(new Event('online'));
  });
}

async function addPhoto(
  page: Page,
  options: {
    date: string;
    note: string;
    expectedCount: number;
  },
): Promise<void> {
  await page.getByTestId('progress-photo-input').setInputFiles({
    name: 'progress-photo-test.jpg',
    mimeType: 'image/jpeg',
    buffer: TEST_JPEG,
  });
  await page.getByLabel('Date').fill(options.date);
  await page.getByLabel(/Note/).fill(options.note);
  await page.getByRole('button', { name: /Enregistrer la photo|Réessayer/ }).click();
  const countLabel = `${options.expectedCount} photo${options.expectedCount > 1 ? 's' : ''} · stockage restant estimé`;
  await expect(page.getByText(countLabel, { exact: false })).toBeVisible();
}

async function navigateToProgression(page: Page): Promise<void> {
  const desktopBackLink = page.getByRole('link', {
    name: 'Retour à la progression',
  });
  if (await desktopBackLink.isVisible()) {
    await desktopBackLink.click();
    return;
  }
  await page.getByRole('link', { name: 'Progression', exact: true }).first().click();
}

test('protège une saisie non enregistrée puis désarme la protection après sauvegarde', async ({
  page,
}) => {
  await createLocalProfile(page, 'Guard photo');
  await page.goto('/#/progression/photos');

  await navigateToProgression(page);
  await expect(page).toHaveURL(/#\/progression$/);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  await page.goto('/#/progression/photos');
  await page.getByTestId('progress-photo-input').setInputFiles({
    name: 'progress-photo-guard.jpg',
    mimeType: 'image/jpeg',
    buffer: TEST_JPEG,
  });
  await page.getByLabel(/Note/).fill('Saisie à conserver.');

  await navigateToProgression(page);
  const guardDialog = page.getByRole('alertdialog', {
    name: 'Quitter sans enregistrer ?',
  });
  await expect(guardDialog).toBeVisible();
  await guardDialog.getByRole('button', { name: 'Continuer la modification' }).click();
  await expect(page).toHaveURL(/#\/progression\/photos$/);
  await expect(page.getByText('progress-photo-guard.jpg')).toBeVisible();
  await expect(page.getByLabel(/Note/)).toHaveValue('Saisie à conserver.');

  await navigateToProgression(page);
  await guardDialog.getByRole('button', { name: 'Quitter' }).click();
  await expect(page).toHaveURL(/#\/progression$/);

  await page.goto('/#/progression/photos');
  await addPhoto(page, {
    date: await getBrowserLocalDate(page),
    note: 'Saisie enregistrée.',
    expectedCount: 1,
  });
  await navigateToProgression(page);
  await expect(page).toHaveURL(/#\/progression$/);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);
});

test('enregistre hors ligne et conserve les photos après rechargement', async ({
  page,
  context,
  browserName,
}) => {
  await createLocalProfile(page, 'Photos locales');
  await page.goto('/#/progression/photos');
  await expectPageAccessibilityBaseline(page, {
    expectedHeading: 'Photos de progression',
    checkShellTouchTargets: true,
  });
  await expect(page.getByText('Choisir une photo', { exact: true })).toBeVisible();
  await expect(page.getByText('Prendre une photo', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Choisir dans la galerie', { exact: true })).toHaveCount(0);
  expect(await page.getByTestId('progress-photo-input').getAttribute('capture')).toBeNull();

  const apiRequests: string[] = [];
  page.on('request', (request) => {
    const url = request.url();
    if (/\/api\/|openfoodfacts|googleapis|gemini/i.test(url)) apiRequests.push(url);
  });

  await setPhotoTestOffline(page, context, browserName, true);
  await expect(page.getByText(/^Hors ligne/)).toBeVisible();
  expect(await page.evaluate(() => navigator.onLine)).toBe(false);
  await addPhoto(page, {
    date: await getBrowserLocalDate(page),
    note: 'Photo enregistrée hors ligne.',
    expectedCount: 1,
  });
  await expect(page.getByAltText(/Photo de progression face/)).toBeVisible();
  expect(apiRequests).toEqual([]);

  await setPhotoTestOffline(page, context, browserName, false);
  expect(await page.evaluate(() => navigator.onLine)).toBe(true);
  await page.reload();
  await expect(page.getByText('1 photo · stockage restant estimé', { exact: false })).toBeVisible();
  await expect(page.getByAltText(/Photo de progression face/)).toBeVisible();

  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Exporter les photos' }).click();
  const download = await downloadPromise;
  const archivePath = await download.path();
  expect(archivePath).not.toBeNull();
  await expect(page.getByText('Archive créée')).toBeVisible();

  await page.getByRole('button', { name: 'Supprimer toutes les photos' }).click();
  const deleteDialog = page.getByRole('alertdialog', {
    name: 'Supprimer toutes les photos ?',
  });
  await deleteDialog.getByRole('button', { name: 'Tout supprimer' }).click();
  await expect(page.getByRole('heading', { name: 'Aucune photo de progression' })).toBeVisible();

  await page.getByLabel('Choisir une archive de photos SportPilot').setInputFiles(
    archivePath!,
  );
  await expect(page.getByText('Photos restaurées')).toBeVisible();
  await expect(page.getByText('1 photo · stockage restant estimé', { exact: false })).toBeVisible();
  await expect(page.getByAltText(/Photo de progression face/)).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);
});

test('compare deux dates de la même vue au toucher et au clavier', async ({ page }) => {
  await createLocalProfile(page, 'Comparaison photo');
  await page.goto('/#/progression/photos');

  await addPhoto(page, {
    date: await previousLocalDate(page),
    note: 'Avant.',
    expectedCount: 1,
  });
  await addPhoto(page, {
    date: await getBrowserLocalDate(page),
    note: 'Après.',
    expectedCount: 2,
  });

  const compareLink = page.getByRole('link', { name: 'Comparer' });
  await expect(compareLink).toHaveAttribute('aria-disabled', 'false');
  await compareLink.click();

  await expectPageAccessibilityBaseline(page, {
    expectedHeading: 'Comparer deux photos',
    checkShellTouchTargets: true,
  });
  const beforeSelect = page.getByRole('combobox', { name: 'Avant', exact: true });
  const afterSelect = page.getByRole('combobox', { name: 'Après', exact: true });
  await expect(page.getByLabel('Vue commune')).toHaveValue('front');
  await expect(beforeSelect).not.toHaveValue('');
  await expect(afterSelect).not.toHaveValue('');

  const separator = page.getByRole('slider', {
    name: 'Position du séparateur avant après',
  });
  await expect(separator).toHaveValue('50');
  await separator.focus();
  await expect(separator).toBeFocused();
  await page.keyboard.press('ArrowRight');
  await expect(separator).toHaveValue('51');

  const beforeValue = await beforeSelect.inputValue();
  const afterValue = await afterSelect.inputValue();
  await page.getByRole('button', { name: 'Inverser avant et après' }).click();
  await expect(beforeSelect).toHaveValue(afterValue);
  await expect(afterSelect).toHaveValue(beforeValue);
  await expectNoCriticalHorizontalOverflow(page);
});
