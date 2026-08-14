import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface TestRecipeFormValues {
  name: string;
  numberOfServings: number;
  notes?: string;
  ingredients: Array<{ productId: string; quantity: number }>;
}

const mocks = vi.hoisted(() => ({
  loadRecipeDetails: vi.fn(),
  saveRecipe: vi.fn(),
  saveSettled: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/application/recipes/recipeService', () => ({
  loadRecipeDetails: mocks.loadRecipeDetails,
  saveRecipe: mocks.saveRecipe,
}));

vi.mock('@/shared/toast/useActionToast', () => ({
  useActionToast: () => ({
    error: mocks.toastError,
  }),
}));

vi.mock('@/features/recipes/components/RecipeForm', () => ({
  RecipeForm: ({
    initialValues,
    onSubmit,
    submitLabel,
  }: {
    initialValues: TestRecipeFormValues;
    onSubmit: (values: TestRecipeFormValues) => Promise<void>;
    submitLabel: string;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void onSubmit({
          ...initialValues,
          name: String(formData.get('name') ?? ''),
        }).catch(() => undefined).finally(() => mocks.saveSettled());
      }}
    >
      <label htmlFor="test-recipe-name">Nom de la recette</label>
      <input
        id="test-recipe-name"
        name="name"
        defaultValue={initialValues.name}
      />
      <button type="submit">{submitLabel}</button>
    </form>
  ),
}));

import { RecipeEditorPage } from '@/features/recipes/pages/RecipeEditorPage';
import { repositories } from '@/infrastructure/repositories/repositories';

const product = {
  id: 'product-1',
  name: 'Flocons d’avoine',
  basisUnit: 'g',
  nutritionPer100: {
    caloriesKcal: 370,
    proteinGrams: 13,
    carbohydratesGrams: 60,
    fatGrams: 7,
  },
  source: { type: 'manual' },
  isArchived: false,
  isFavorite: false,
};

const recipeDetails = {
  recipe: {
    id: 'recipe-existing',
    name: 'Porridge',
    numberOfServings: 2,
    notes: 'Cuisson douce',
  },
  ingredients: [{
    ingredient: {
      productId: 'product-1',
      quantity: 100,
    },
  }],
};

function renderEditor(editing = false) {
  const router = createMemoryRouter(
    [
      {
        path: editing ? '/recipes/:recipeId/edit' : '/recipes/new',
        element: <RecipeEditorPage />,
      },
      { path: '/recipes', element: <h1>Bibliothèque des recettes</h1> },
    ],
    {
      initialEntries: [editing
        ? '/recipes/recipe-existing/edit'
        : '/recipes/new'],
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('RecipeEditorPage — brouillon', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadRecipeDetails.mockResolvedValue(undefined);
    mocks.saveRecipe.mockResolvedValue({ recipe: { id: 'recipe-saved' } });
    vi.spyOn(repositories.food, 'listProducts').mockResolvedValue([product] as never);
  });

  it('laisse revenir immédiatement lorsque la saisie est intacte', async () => {
    const user = userEvent.setup();
    const router = renderEditor();

    await screen.findByLabelText('Nom de la recette');
    await user.click(screen.getByRole('link', { name: 'Retour aux recettes' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des recettes' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/recipes');
  });

  it('conserve la saisie après annulation puis respecte le retour après confirmation', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    const name = await screen.findByLabelText('Nom de la recette');

    await user.type(name, 'Porridge protéiné');
    await user.click(screen.getByRole('link', { name: 'Retour aux recettes' }));

    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(name).toHaveValue('Porridge protéiné');

    await user.click(screen.getByRole('link', { name: 'Retour aux recettes' }));
    await user.click(screen.getByRole('button', { name: 'Quitter' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des recettes' }))
      .toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/recipes');
  });

  it('désactive la garde après la création réussie', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    const name = await screen.findByLabelText('Nom de la recette');

    await user.type(name, 'Porridge protéiné');
    await user.click(screen.getByRole('button', { name: 'Créer la recette' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des recettes' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.saveRecipe).toHaveBeenCalledWith({
      name: 'Porridge protéiné',
      numberOfServings: 2,
      ingredients: [{ productId: '', quantity: 100 }],
      notes: '',
    });
    expect(router.state.location.state).toMatchObject({
      foodLibraryFeedback: {
        title: 'Recette créée',
        itemId: 'recipe-saved',
      },
    });
  });

  it('désactive la garde après la modification réussie', async () => {
    const user = userEvent.setup();
    mocks.loadRecipeDetails.mockResolvedValueOnce(recipeDetails);
    renderEditor(true);
    const name = await screen.findByLabelText('Nom de la recette');

    await user.clear(name);
    await user.type(name, 'Porridge banane');
    await user.click(screen.getByRole('button', { name: 'Enregistrer la recette' }));

    expect(await screen.findByRole('heading', { name: 'Bibliothèque des recettes' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.saveRecipe).toHaveBeenCalledWith({
      recipeId: 'recipe-existing',
      name: 'Porridge banane',
      numberOfServings: 2,
      ingredients: [{ productId: 'product-1', quantity: 100 }],
      notes: 'Cuisson douce',
    });
  });

  it('conserve la garde active après une erreur de sauvegarde', async () => {
    const user = userEvent.setup();
    mocks.saveRecipe.mockRejectedValueOnce(new Error('écriture impossible'));
    renderEditor();
    const name = await screen.findByLabelText('Nom de la recette');

    await user.type(name, 'Porridge protéiné');
    await user.click(screen.getByRole('button', { name: 'Créer la recette' }));
    await waitFor(() => expect(mocks.saveSettled).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('link', { name: 'Retour aux recettes' }));

    expect(mocks.toastError).toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    expect(name).toHaveValue('Porridge protéiné');
  });
});
