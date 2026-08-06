import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { FoodProductEditorPage } from '@/features/products/pages/FoodProductEditorPage';
import { repositories } from '@/infrastructure/repositories/repositories';

const existingProduct = {
  id: 'product-existing',
  name: 'Yaourt nature',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 60,
    proteinGrams: 5,
    carbohydratesGrams: 4,
    fatGrams: 2,
  },
  source: { type: 'manual' },
  isArchived: false,
  isFavorite: false,
};

const duplicateProduct = {
  ...existingProduct,
  id: 'product-duplicate',
  name: 'Skyr vanille',
};

function renderEditor(editing = false) {
  const router = createMemoryRouter(
    [
      {
        path: editing ? '/food/products/:productId/edit' : '/food/products/new',
        element: <FoodProductEditorPage />,
      },
      { path: '/food/products', element: <h1>Bibliothèque des aliments</h1> },
    ],
    {
      initialEntries: [editing
        ? '/food/products/product-existing/edit'
        : '/food/products/new'],
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FoodProductEditorPage — brouillon', () => {
  beforeEach(() => {
    vi.spyOn(repositories.food, 'listProducts').mockResolvedValue([]);
    vi.spyOn(repositories.food, 'getProductById').mockResolvedValue(existingProduct as never);
    vi.spyOn(repositories.food, 'createProduct').mockResolvedValue({
      ...existingProduct,
      id: 'product-created',
      name: 'Skyr vanille',
    } as never);
    vi.spyOn(repositories.food, 'updateProduct').mockResolvedValue({
      ...existingProduct,
      name: 'Yaourt grec',
    } as never);
  });

  it('laisse revenir immédiatement lorsque la saisie est intacte', async () => {
    const user = userEvent.setup();
    const router = renderEditor();

    await screen.findByLabelText('Nom de l’aliment');
    await user.click(screen.getByRole('link', { name: 'Retour aux aliments' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des aliments' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/food/products');
  });

  it('conserve la saisie après annulation puis respecte le retour après confirmation', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    const name = await screen.findByLabelText('Nom de l’aliment');

    await user.type(name, 'Skyr vanille');
    await user.click(screen.getByRole('link', { name: 'Retour aux aliments' }));

    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(name).toHaveValue('Skyr vanille');

    await user.click(screen.getByRole('link', { name: 'Retour aux aliments' }));
    await user.click(screen.getByRole('button', { name: 'Quitter' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des aliments' }))
      .toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/food/products');
  });

  it('désactive la garde après la création réussie', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    const name = await screen.findByLabelText('Nom de l’aliment');

    await user.type(name, 'Skyr vanille');
    await user.click(screen.getByRole('button', { name: 'Créer l’aliment' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des aliments' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(repositories.food.createProduct).toHaveBeenCalledWith(expect.objectContaining({
      name: 'Skyr vanille',
      nutritionPer100: {
        caloriesKcal: 0,
        proteinGrams: 0,
        carbohydratesGrams: 0,
        fatGrams: 0,
      },
    }));
    expect(router.state.location.state).toMatchObject({
      foodLibraryFeedback: {
        title: 'Aliment créé',
        itemId: 'product-created',
      },
    });
  });

  it('désactive la garde après la modification réussie', async () => {
    const user = userEvent.setup();
    renderEditor(true);
    const name = await screen.findByLabelText('Nom de l’aliment');

    await user.clear(name);
    await user.type(name, 'Yaourt grec');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des aliments' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(repositories.food.updateProduct).toHaveBeenCalledWith(
      'product-existing',
      expect.objectContaining({ name: 'Yaourt grec' }),
    );
  });

  it('conserve la garde active après une détection de doublon', async () => {
    const user = userEvent.setup();
    vi.mocked(repositories.food.listProducts).mockResolvedValueOnce([duplicateProduct] as never);
    renderEditor();
    const name = await screen.findByLabelText('Nom de l’aliment');

    await user.type(name, 'Skyr vanille');
    await user.click(screen.getByRole('button', { name: 'Créer l’aliment' }));
    expect(await screen.findByText('Un aliment avec le même nom et la même marque existe déjà.'))
      .toBeInTheDocument();
    await user.click(screen.getByRole('link', { name: 'Retour aux aliments' }));

    expect(repositories.food.createProduct).not.toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    expect(name).toHaveValue('Skyr vanille');
  });
});
