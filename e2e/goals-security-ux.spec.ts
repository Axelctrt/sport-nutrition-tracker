import { expect, test } from '@playwright/test';

import {
  createLocalProfile,
  expectNoCriticalHorizontalOverflow,
} from './helpers/app';

test('crée puis modifie un objectif sans permettre le changement de métrique', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/goals');

  await expect(
    page.getByRole('heading', {
      name: 'Objectifs de progression',
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByLabel('Nom personnalisé')).toHaveCount(0);

  await page.getByRole('button', { name: 'Créer un objectif' }).click();
  const createDialog = page.getByRole('dialog', { name: 'Créer un objectif' });
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByLabel(/Type d’objectif/)).toHaveValue('totalSteps');
  await createDialog.getByLabel('Nom personnalisé').fill('Pas du mois');
  await createDialog.getByLabel(/Cible/).fill('120000');
  await createDialog.getByRole('button', { name: 'Créer l’objectif' }).click();

  await expect(createDialog).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Pas du mois' })).toBeVisible();
  await expectNoCriticalHorizontalOverflow(page);

  await page.getByRole('button', { name: 'Modifier' }).click();
  const editDialog = page.getByRole('dialog', { name: 'Modifier un objectif' });
  await expect(editDialog).toBeVisible();
  await expect(editDialog.getByLabel(/Type d’objectif/)).toHaveCount(0);
  await expect(editDialog.getByText('Cumuler des pas', { exact: true })).toBeVisible();
  await expect(
    editDialog.getByText('Pour changer de métrique, crée un nouvel objectif.'),
  ).toBeVisible();
  await editDialog.getByLabel(/Cible/).fill('150000');
  await editDialog.getByRole('button', { name: 'Enregistrer les modifications' }).click();

  await expect(editDialog).toBeHidden();
  await page.getByRole('button', { name: 'Modifier' }).click();
  await expect(
    page.getByRole('dialog', { name: 'Modifier un objectif' }).getByLabel(/Cible/),
  ).toHaveValue('150000');
});

test('protège l’abandon des changements non enregistrés', async ({ page }) => {
  await createLocalProfile(page);
  await page.goto('/#/goals');
  await page.getByRole('button', { name: 'Créer un objectif' }).click();

  const createDialog = page.getByRole('dialog', { name: 'Créer un objectif' });
  await createDialog.getByLabel('Nom personnalisé').fill('Objectif temporaire');
  await page.getByRole('button', { name: 'Fermer l’éditeur d’objectif' }).click();

  const discardDialog = page.getByRole('dialog', {
    name: 'Annuler les modifications ?',
  });
  await expect(discardDialog).toBeVisible();
  await discardDialog.getByRole('button', { name: 'Continuer la modification' }).click();
  await expect(createDialog).toBeVisible();
  await expect(createDialog.getByLabel('Nom personnalisé')).toHaveValue('Objectif temporaire');

  await page.getByRole('button', { name: 'Fermer l’éditeur d’objectif' }).click();
  await discardDialog.getByRole('button', { name: 'Abandonner les modifications' }).click();
  await expect(createDialog).toBeHidden();
  await expect(page.getByRole('button', { name: 'Créer un objectif' })).toHaveFocus();
  await expectNoCriticalHorizontalOverflow(page);
});
