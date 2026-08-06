import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {
  RouterProvider,
  createMemoryRouter,
} from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

interface TestFoodProductFormValues {
  name: string;
  brand: string;
  basisUnit: 'g' | 'ml';
  servingSize?: number;
  servingLabel: string;
  caloriesKcal: number;
  proteinGrams: number;
  carbohydratesGrams: number;
  fatGrams: number;
  fiberGrams?: number;
  saltGrams?: number;
  barcode: string;
  isFavorite: boolean;
}

const defaultValues: TestFoodProductFormValues = {
  name: '',
  brand: '',
  basisUnit: 'g',
  servingLabel: '',
  caloriesKcal: 0,
  proteinGrams: 0,
  carbohydratesGrams: 0,
  fatGrams: 0,
  barcode: '',
  isFavorite: false,
};

const mocks = vi.hoisted(() => ({
  findDuplicates: vi.fn(),
  saveSettled: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/application/food/foodProductDuplicateService', () => ({
  findFoodProductDuplicates: mocks.findDuplicates,
}));

vi.mock('@/features/products/utils/foodProductForm', () => ({
  defaultFoodProductFormValues: defaultValues,
  formValuesToProductInput: (values: TestFoodProductFormValues) => ({
    ...values,
    source: { type: 'manual' as const },
  }),
  productToFormValues: (product: { name: string }) => ({
    ...defaultValues,
    name: product.name,
  }),
}));

vi.mock('@/shared/toast/useActionToast', () => ({
  useActionToast: () => ({
    success: mocks.toastSuccess,
    error: mocks.toastError,
  }),
}));

vi.mock('@/features/products/components/FoodProductForm', () => ({
  FoodProductForm: ({
    initialValues,
    onSubmit,
    submitLabel,
  }: {
    initialValues: TestFoodProductFormValues;
    onSubmit: (values: TestFoodProductFormValues) => Promise<void>;
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
      <label htmlFor="test-food-product-name">Nom de l’aliment</label>
      <input
        id="test-food-product-name"
        name="name"
        defaultValue={initialValues.name}
      />
      <button type="submit">{submitLabel}</button>
    </form>
  ),
}));

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
    vi.clearAllMocks();
    mocks.findDuplicates.mockReturnValue([]);
    vi.spyOn(repositories.food, 'listProducts').mockResolvedValue([]);
    vi.spyOn(repositories.food, 'getProductById').mockResolvedValue(existingProduct as never);
    vi.spyOn(repositories.food, 'createProduct').mockResolvedValue({ id: 'product-created' } as never);
    vi.spyOn(repositories.food, 'updateProduct').mockResolvedValue({ id: 'product-existing' } as never);
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
    expect(repositories.food.createProduct).toHaveBeenCalled();
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

  it('conserve la garde active après une erreur de sauvegarde', async () => {
    const user = userEvent.setup();
    vi.mocked(repositories.food.createProduct).mockRejectedValueOnce(new Error('écriture impossible'));
    renderEditor();
    const name = await screen.findByLabelText('Nom de l’aliment');

    await user.type(name, 'Skyr vanille');
    await user.click(screen.getByRole('button', { name: 'Créer l’aliment' }));
    await waitFor(() => expect(mocks.saveSettled).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('link', { name: 'Retour aux aliments' }));

    expect(screen.getByRole('alertdialog', { name: 'Quitter sans enregistrer ?' }))
      .toBeInTheDocument();
    expect(name).toHaveValue('Skyr vanille');
  });

  it('conserve la garde active après une détection de doublon', async () => {
    const user = userEvent.setup();
    mocks.findDuplicates.mockReturnValueOnce([{
      reason: 'name-and-brand',
      product: { id: 'product-duplicate', name: 'Skyr vanille' },
    }]);
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
