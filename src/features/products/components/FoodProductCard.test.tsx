import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { vi } from 'vitest';
import { FoodProductCard } from '@/features/products/components/FoodProductCard';
import { createFoodProduct } from '@/test/factories/foodLibraryFactory';

const product = createFoodProduct({ isFavorite: true });

function renderCard(onArchive = vi.fn().mockResolvedValue(true)) {
  render(
    <MemoryRouter>
      <FoodProductCard
        product={product}
        navigationState={{
          foodLibraryReturn: { path: '/food/products', scrollKey: 'key', section: 'products' },
        }}
        onArchive={onArchive}
      />
    </MemoryRouter>,
  );
  return onArchive;
}

describe('FoodProductCard', () => {
  it('affiche les valeurs essentielles sans actions permanentes', () => {
    renderCard();

    expect(screen.getByRole('heading', { name: 'Yaourt grec' })).toBeInTheDocument();
    expect(screen.getByText('120 kcal / 100 g')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Modifier' }).closest('details')).not.toHaveAttribute('open');
  });

  it('demande une confirmation avant archivage', async () => {
    const user = userEvent.setup();
    const onArchive = renderCard();

    await user.click(screen.getByRole('button', { name: 'Actions pour Yaourt grec' }));
    await user.click(screen.getByRole('button', { name: 'Archiver' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Archiver cet aliment ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Archiver' }));

    await waitFor(() => expect(onArchive).toHaveBeenCalledWith('product-1'));
  });
});
