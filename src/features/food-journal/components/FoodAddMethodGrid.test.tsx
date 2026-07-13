import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { FoodAddMethodGrid } from '@/features/food-journal/components/FoodAddMethodGrid';
import type { FoodAddMethod } from '@/features/food-journal/preferences/foodAddMethodPreference';

function renderGrid(options: {
  lastMethod?: FoodAddMethod;
  hasFavoriteProducts?: boolean;
} = {}) {
  const onSelectSource = vi.fn();
  const onSearchRequested = vi.fn();
  const onMethodUsed = vi.fn();
  render(
    <MemoryRouter>
      <FoodAddMethodGrid
        date="2026-07-10"
        mealSlot="lunch"
        activeSource="recent"
        searchActive={false}
        hasFavoriteProducts={options.hasFavoriteProducts ?? false}
        lastMethod={options.lastMethod}
        onSelectSource={onSelectSource}
        onSearchRequested={onSearchRequested}
        onMethodUsed={onMethodUsed}
      />
    </MemoryRouter>,
  );
  return { onSelectSource, onSearchRequested, onMethodUsed };
}

describe('FoodAddMethodGrid', () => {
  it('met en avant trois méthodes rapides et conserve toutes les autres dans un groupe replié', async () => {
    const user = userEvent.setup();
    const { onSelectSource, onSearchRequested, onMethodUsed } = renderGrid();

    expect(screen.getByRole('heading', { name: 'Ajouter rapidement' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Rechercher/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^Récents/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /^Scanner/i })).toHaveAttribute(
      'href',
      '/food/barcode-scanner?date=2026-07-10&slot=lunch',
    );

    const advanced = screen.getByText('Autres méthodes').closest('details');
    expect(advanced).not.toHaveAttribute('open');
    await user.click(screen.getByText('Autres méthodes'));

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
    expect(onMethodUsed).toHaveBeenLastCalledWith('favorites');
    expect(onSelectSource).toHaveBeenCalledWith('favorites');

    await user.click(screen.getByRole('button', { name: /^Rechercher/i }));
    expect(onMethodUsed).toHaveBeenLastCalledWith('search');
    expect(onSearchRequested).toHaveBeenCalledOnce();
  });

  it('expose la dernière méthode avancée comme raccourci sans la dupliquer', () => {
    renderGrid({ lastMethod: 'photo' });

    expect(screen.getByRole('heading', { name: 'Ton raccourci' })).toBeInTheDocument();
    expect(screen.getByText('Dernière méthode')).toBeInTheDocument();
    expect(Array.from(document.querySelectorAll('a')).filter((link) =>
      link.getAttribute('href') === '/food/photo-estimate?date=2026-07-10&slot=lunch',
    )).toHaveLength(1);
  });

  it('suggère les favoris lorsque le repas n’a pas encore de préférence', () => {
    renderGrid({ hasFavoriteProducts: true });

    expect(screen.getByText('Selon tes favoris')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Favoris/i })).toBeInTheDocument();
  });
});
