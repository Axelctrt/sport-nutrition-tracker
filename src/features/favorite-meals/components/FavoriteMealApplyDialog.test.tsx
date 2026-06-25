import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FavoriteMealApplyDialog } from '@/features/favorite-meals/components/FavoriteMealApplyDialog';
import { createFavoriteMealSummary } from '@/test/factories/foodLibraryFactory';

describe('FavoriteMealApplyDialog', () => {
  it('préremplit le repas habituel et transmet la destination', async () => {
    const user = userEvent.setup();
    const onApply = vi.fn().mockResolvedValue(undefined);
    render(
      <FavoriteMealApplyDialog
        favorite={createFavoriteMealSummary()}
        initialDate="2026-06-25"
        busy={false}
        onClose={vi.fn()}
        onApply={onApply}
      />,
    );

    expect(screen.getByLabelText('Date')).toHaveValue('2026-06-25');
    expect(screen.getByLabelText('Repas')).toHaveValue('breakfast');
    await user.selectOptions(screen.getByLabelText('Repas'), 'lunch');
    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));

    expect(onApply).toHaveBeenCalledWith('2026-06-25', 'lunch');
  });
});
