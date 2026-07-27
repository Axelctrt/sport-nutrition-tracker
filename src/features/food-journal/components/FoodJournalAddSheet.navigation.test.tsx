import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { barcodeScannerPath } from '@/app/routePaths';
import { FoodJournalAddSheet } from '@/features/food-journal/components/FoodJournalAddSheet';

describe('FoodJournalAddSheet navigation', () => {
  it('restaure les methodes et synchronise le retour d etape', async () => {
    const user = userEvent.setup();
    const onStepChange = vi.fn();

    render(
      <MemoryRouter>
        <FoodJournalAddSheet
          open
          date="2026-07-10"
          initialSlot="dinner"
          initialStep="method"
          navigationStates={new Map()}
          onStepChange={onStepChange}
          onClose={vi.fn()}
        />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Scanner un produit/ })).toHaveAttribute(
      'href',
      barcodeScannerPath('2026-07-10', 'dinner'),
    );

    await user.click(screen.getByRole('button', { name: 'Choisir un autre repas' }));
    expect(onStepChange).toHaveBeenCalledWith('meal', 'dinner');
  });
});
