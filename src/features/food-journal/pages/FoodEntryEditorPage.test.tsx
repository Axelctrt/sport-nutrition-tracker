import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  saveProductEntry: vi.fn(),
}));

vi.mock('@/application/food/foodJournalService', () => ({
  saveProductEntry: mocks.saveProductEntry,
}));

vi.mock('@/features/food-journal/components/FoodEntryForm', () => ({
  FoodEntryForm: ({
    initialValues,
    onSubmit,
    submitLabel,
  }: {
    initialValues: {
      date: string;
      mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
      productId: string;
      inputMode: 'amount' | 'servings';
      inputQuantity: number;
    };
    onSubmit: (values: {
      date: string;
      mealSlot: 'breakfast' | 'lunch' | 'dinner' | 'snacks';
      productId: string;
      inputMode: 'amount' | 'servings';
      inputQuantity: number;
    }) => Promise<void>;
    submitLabel: string;
  }) => (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        void onSubmit({
          ...initialValues,
          inputQuantity: Number(formData.get('inputQuantity')),
        }).catch(() => undefined);
      }}
    >
      <label htmlFor="test-food-entry-quantity">Quantité consommée</label>
      <input
        id="test-food-entry-quantity"
        name="inputQuantity"
        type="number"
        defaultValue={initialValues.inputQuantity}
      />
      <button type="submit">{submitLabel}</button>
    </form>
  ),
}));

import { FoodEntryEditorPage } from '@/features/food-journal/pages/FoodEntryEditorPage';
import { repositories } from '@/infrastructure/repositories/repositories';

const returnPath = '/food-journal?date=2026-08-06';
const returnState = {
  foodJournalReturn: {
    path: returnPath,
    mealSlot: 'lunch' as const,
    scrollKey: 'nutrition-journal-location',
  },
};

function renderEditor() {
  const router = createMemoryRouter(
    [
      { path: '/food-journal/entry', element: <FoodEntryEditorPage /> },
      { path: '/food-journal', element: <h1>Journal alimentaire destination</h1> },
    ],
    {
      initialEntries: [{
        pathname: '/food-journal/entry',
        search: '?date=2026-08-06&slot=lunch&productId=product-1',
        state: returnState,
      }],
    },
  );

  render(<RouterProvider router={router} />);
  return router;
}

afterEach(cleanup);

describe('FoodEntryEditorPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(repositories.food, 'listProducts').mockResolvedValue([{}] as never);
    vi.spyOn(repositories.food, 'getEntryById').mockResolvedValue(undefined);
    mocks.saveProductEntry.mockResolvedValue({ id: 'food-entry-saved' });
  });

  it('laisse revenir immédiatement lorsque la saisie est intacte', async () => {
    const user = userEvent.setup();
    const router = renderEditor();

    await screen.findByLabelText('Quantité consommée');
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
    const quantity = await screen.findByLabelText('Quantité consommée');

    await user.clear(quantity);
    await user.type(quantity, '175');
    await user.click(screen.getByRole('link', { name: 'Retour au journal' }));

    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Continuer la modification' }));
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(quantity).toHaveValue(175);

    await user.click(screen.getByRole('link', { name: 'Retour au journal' }));
    await user.click(screen.getByRole('button', { name: 'Quitter' }));

    expect(await screen.findByRole('heading', { name: 'Journal alimentaire destination' }))
      .toBeInTheDocument();
    expect(router.state.location.pathname).toBe('/food-journal');
    expect(router.state.location.search).toBe('?date=2026-08-06');
  });

  it('désactive la garde après une sauvegarde réussie avant de naviguer', async () => {
    const user = userEvent.setup();
    const router = renderEditor();
    const quantity = await screen.findByLabelText('Quantité consommée');

    await user.clear(quantity);
    await user.type(quantity, '140');
    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));

    expect(await screen.findByRole('heading', { name: 'Journal alimentaire destination' }))
      .toBeInTheDocument();
    expect(screen.queryByRole('alertdialog')).not.toBeInTheDocument();
    expect(mocks.saveProductEntry).toHaveBeenCalledWith({
      date: '2026-08-06',
      mealSlot: 'lunch',
      productId: 'product-1',
      inputMode: 'amount',
      inputQuantity: 140,
    });
    expect(router.state.location.state).toMatchObject({
      foodJournalFeedback: {
        title: 'Aliment ajouté au déjeuner',
        mealSlot: 'lunch',
        entryId: 'food-entry-saved',
      },
    });
  });

  it('conserve la garde active après une erreur de sauvegarde', async () => {
    const user = userEvent.setup();
    mocks.saveProductEntry.mockRejectedValueOnce(new Error('écriture impossible'));
    renderEditor();
    const quantity = await screen.findByLabelText('Quantité consommée');

    await user.clear(quantity);
    await user.type(quantity, '160');
    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));
    await user.click(screen.getByRole('link', { name: 'Retour au journal' }));

    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    expect(quantity).toHaveValue(160);
  });
});
