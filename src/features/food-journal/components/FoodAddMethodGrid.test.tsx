import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FoodAddMethodGrid } from '@/features/food-journal/components/FoodAddMethodGrid';

function renderGrid() {
  const onSelectSource = vi.fn();
  const onSearchRequested = vi.fn();
  render(
    <MemoryRouter>
      <FoodAddMethodGrid
        date="2026-07-10"
        mealSlot="lunch"
        activeSource="recent"
        searchActive={false}
        onSelectSource={onSelectSource}
        onSearchRequested={onSearchRequested}
      />
    </MemoryRouter>,
  );
  return { onSelectSource, onSearchRequested };
}

describe('FoodAddMethodGrid', () => {
  it('propose toutes les méthodes avec le contexte du repas', async () => {
    const user = userEvent.setup();
    const { onSelectSource, onSearchRequested } = renderGrid();

    expect(screen.getByRole('link', { name: /Scanner/i })).toHaveAttribute(
      'href',
      '/food/barcode-scanner?date=2026-07-10&slot=lunch',
    );
    expect(screen.getByRole('link', { name: /^Photo/i })).toHaveAttribute(
      'href',
      '/food/photo-estimate?date=2026-07-10&slot=lunch',
    );
    expect(screen.getByRole('link', { name: /^Recettes/i })).toHaveAttribute(
      'href',
      '/recipes?date=2026-07-10&slot=lunch',
    );
    expect(screen.getByRole('link', { name: /^Repas favoris/i })).toHaveAttribute(
      'href',
      '/food/favorites?date=2026-07-10&slot=lunch',
    );
    expect(screen.getByRole('link', { name: /^Ajout manuel/i })).toHaveAttribute(
      'href',
      '/food/products/new?returnDate=2026-07-10&returnSlot=lunch',
    );

    await user.click(screen.getByRole('button', { name: /^Favoris/i }));
    expect(onSelectSource).toHaveBeenCalledWith('favorites');

    await user.click(screen.getByRole('button', { name: /^Rechercher/i }));
    expect(onSearchRequested).toHaveBeenCalledOnce();
  });
});
