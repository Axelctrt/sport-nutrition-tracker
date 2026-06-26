import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { RecipeLibraryCard } from '@/features/recipes/components/RecipeLibraryCard';
import { createRecipeSummary } from '@/test/factories/foodLibraryFactory';

const summary = createRecipeSummary();

function renderCard(onDelete = vi.fn().mockResolvedValue(true)) {
  render(
    <MemoryRouter>
      <RecipeLibraryCard
        summary={summary}
        targetDate="2026-06-25"
        targetSlot="lunch"
        navigationState={{
          foodLibraryReturn: { path: '/recipes', scrollKey: 'key', section: 'recipes' },
        }}
        onDelete={onDelete}
      />
    </MemoryRouter>,
  );
  return onDelete;
}

describe('RecipeLibraryCard', () => {
  it('présente les macros et garde l’ajout au journal prioritaire', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Bowl protéiné' })).toBeInTheDocument();
    expect(screen.getByText('300 kcal / portion')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Ajouter au journal' })).toHaveAttribute(
      'href',
      '/recipes/recipe-1/add?date=2026-06-25&slot=lunch',
    );
  });

  it('confirme la suppression depuis le menu secondaire', async () => {
    const user = userEvent.setup();
    const onDelete = renderCard();

    await user.click(screen.getByRole('button', { name: 'Actions pour Bowl protéiné' }));
    await user.click(screen.getByRole('button', { name: 'Supprimer' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Supprimer cette recette ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Supprimer' }));

    await waitFor(() => expect(onDelete).toHaveBeenCalledWith('recipe-1'));
  });
});
