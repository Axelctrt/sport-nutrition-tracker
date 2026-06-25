import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import type { FoodProduct } from '@/domain/models/food';
import { FoodEntryQuickDialog } from '@/features/food-journal/components/FoodEntryQuickDialog';

const product: FoodProduct = {
  id: 'product-1',
  createdAt: '2026-06-26T10:00:00.000Z',
  updatedAt: '2026-06-26T10:00:00.000Z',
  name: 'Yaourt grec',
  brand: 'SportPilot',
  basisUnit: 'g',
  servingSize: 125,
  nutritionPer100: {
    caloriesKcal: 120,
    proteinGrams: 9,
    carbohydratesGrams: 4,
    fatGrams: 7,
  },
  source: { type: 'manual' },
  isNutritionComplete: true,
  isFavorite: true,
  isArchived: false,
};

function DialogHarness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Choisir le yaourt</button>
      <FoodEntryQuickDialog
        product={open ? product : undefined}
        date="2026-06-26"
        mealSlot="lunch"
        onClose={() => setOpen(false)}
        onSubmit={async () => undefined}
      />
    </>
  );
}

afterEach(cleanup);

describe('FoodEntryQuickDialog', () => {
  it('ouvre la quantité dans une feuille mobile et restitue le focus à la fermeture', async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole('button', { name: 'Choisir le yaourt' });
    await user.click(trigger);

    expect(screen.getByRole('dialog', { name: 'Yaourt grec' })).toBeInTheDocument();
    const quantity = screen.getByRole('spinbutton', { name: /Quantité en g/i });
    await waitFor(() => expect(quantity).toHaveFocus());

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });
});
