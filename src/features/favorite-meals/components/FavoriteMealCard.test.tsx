import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { FavoriteMealCard } from '@/features/favorite-meals/components/FavoriteMealCard';
import { createFavoriteMealSummary } from '@/test/factories/foodLibraryFactory';

const summary = createFavoriteMealSummary();

function renderCard() {
  const onApply = vi.fn();
  const onDelete = vi.fn().mockResolvedValue(true);
  render(<FavoriteMealCard summary={summary} onApply={onApply} onDelete={onDelete} />);
  return { onApply, onDelete };
}

describe('FavoriteMealCard', () => {
  it('ouvre directement la saisie de destination depuis la carte', async () => {
    const user = userEvent.setup();
    const { onApply } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Ajouter au journal' }));
    expect(onApply).toHaveBeenCalledWith(summary);
  });

  it('confirme la suppression dans le menu secondaire', async () => {
    const user = userEvent.setup();
    const { onDelete } = renderCard();

    await user.click(screen.getByRole('button', { name: 'Actions pour Petit-déjeuner habituel' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer ce repas favori ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('favorite-1'));
  });
});
