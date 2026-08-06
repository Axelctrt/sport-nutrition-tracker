import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  loadRecipeDetails: vi.fn(),
  saveRecipeEntry: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/application/recipes/recipeService', () => ({
  loadRecipeDetails: mocks.loadRecipeDetails,
  saveRecipeEntry: mocks.saveRecipeEntry,
}));

vi.mock('@/shared/toast/useActionToast', () => ({
  useActionToast: () => ({
    error: mocks.toastError,
  }),
}));

vi.mock('@/features/recipes/components/RecipeEntryForm', () => ({
  RecipeEntryForm: ({
    initialValues,
    onSubmit,
    submitLabel,
  }: {
    initialValues: {
      date: string;
      mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
      servingsConsumed: number;
    };
    onSubmit: (values: {
      date: string;
      mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
      servingsConsumed: number;
    }) => Promise<void>;
    submitLabel: string;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void onSubmit({
          ...initialValues,
          servingsConsumed: Number(formData.get('servingsConsumed')),
        }).catch(() => undefined);
      }}
    >
      <label htmlFor="test-recipe-entry-servings">Portions consommées</label>
      <input
        id="test-recipe-entry-servings"
        name="servingsConsumed"
        type="number"
        defaultValue={initialValues.servingsConsumed}
      />
      <button type="submit">{submitLabel}</button>
    </form>
  ),
}));

import { RecipeEntryEditorPage } from '@/features/recipes/pages/RecipeEntryEditorPage';
import { repositories } from '@/infrastructure/repositories/repositories';

const returnPath = '/food-journal?date=2026-08-06';
const returnState = {
  foodJournalReturn: {
    path: returnPath,
    date: '2026-08-06',
    scrollKey: 'nutrition-journal-location',
  },
};

function renderEditor(editing = false) {
  const router = createMemoryRouter(
    [
      { path: '/recipes/:recipeId/entry', element: <RecipeEntryEditorPage /> },
      { path: '/food-journal', element: <h1>Journal alimentaire destination</h1> },
    ],
    {
      initialEntries: [{
        pathname: '/recipes/recipe-1/entry',
        search: editing
          ? '?entryId=recipe-entry-existing'
          : '?date=2026-08-06&slot=dinner',
        state: returnState,
      }],
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

afterEach(cleanup);

describe('RecipeEntryEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.loadRecipeDetails.mockResolvedValue({
      recipe: { name: 'Porridge protéiné' },
    });
    mocks.saveRecipeEntry.mockResolvedValue({ id: 'recipe-entry-saved' });
    vi.spyOn(repositories.food, 'getEntryById').mockResolvedValue(undefined);
  });

  it('laisse revenir immédiatement lorsque la saisie est intacte', async () => {
    const user = userEvent.setup();
    const router = renderEditor();

    await screen.findByLabelText('Portions consommées');
    await user.click(screen.getByRole('link', { name: 'Retour au journal' }));

    expect(await screen.findByRole('heading', { name: 'Journal alimentaire destination' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/food-journal');
    expect(router.state.location.search).toBe('?date=2026-08-06');
  });

  it('conserve la saisie après annulation puis emprunte le retour existant après confirmation', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    const servings = await screen.findByLabelText('Portions consommées');

    await user.clear(servings);
    await user.type(servings, '1.75');
    await user.click(screen.getByRole('link', { name: 'Retour au journal' }));

    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(servings).toHaveValue(1.75);

    await user.click(screen.getByRole('link', { name: 'Retour au journal' }));
    await user.click(screen.getByRole('button', { name: 'Quitter' }));

    expect(await screen.findByRole('heading', { name: 'Journal alimentaire destination' }))
      .toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/food-journal');
    expect(router.state.location.search).toBe('?date=2026-08-06');
  });

  it('désactive la garde après la modification réussie d’une entrée existante', async () => {
    const user = userEvent.setup();
    vi.mocked(repositories.food.getEntryById).mockResolvedValueOnce({
      id: 'recipe-entry-existing',
      date: '2026-08-05',
      mealSlot: 'dinner',
      reference: {
        sourceType: 'recipe',
        servingsConsumed: 1.5,
      },
    } as never);
    const router = renderEditor(true);
    const servings = await screen.findByLabelText('Portions consommées');

    await user.clear(servings);
    await user.type(servings, '2');
    await user.click(screen.getByRole('button', { name: 'Enregistrer les modifications' }));

    expect(await screen.findByRole('heading', { name: 'Journal alimentaire destination' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.saveRecipeEntry).toHaveBeenCalledWith({
      entryId: 'recipe-entry-existing',
      recipeId: 'recipe-1',
      date: '2026-08-05',
      mealSlot: 'dinner',
      servingsConsumed: 2,
    });
    expect(router.state.location.state).toMatchObject({
      foodJournalFeedback: {
        title: 'Quantité mise à jour',
        mealSlot: 'dinner',
        entryId: 'recipe-entry-saved',
      },
    });
  });

  it('conserve la garde active après une erreur de sauvegarde', async () => {
    const user = userEvent.setup();
    mocks.saveRecipeEntry.mockRejectedValueOnce(new Error('écriture impossible'));
    renderEditor();
    const servings = await screen.findByLabelText('Portions consommées');

    await user.clear(servings);
    await user.type(servings, '2.25');
    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));
    await user.click(screen.getByRole('link', { name: 'Retour au journal' }));

    expect(mocks.toastError).toHaveBeenCalled();
    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    expect(servings).toHaveValue(2.25);
  });
});
