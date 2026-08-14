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
    expect(screen.getByRole('button', { name: 'Actions pour Yaourt grec' })).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('menu', { name: 'Actions pour Yaourt grec' })).not.toBeInTheDocument();
  });

  it('conserve deux décimales pour une petite quantité de sel', () => {
    render(
      <MemoryRouter>
        <FoodProductCard
          product={createFoodProduct({
            nutritionPer100: {
              ...product.nutritionPer100,
              fiberGrams: 1.5,
              saltGrams: 0.12,
            },
          })}
          navigationState={{
            foodLibraryReturn: { path: '/food/products', scrollKey: 'key', section: 'products' },
          }}
          onArchive={vi.fn().mockResolvedValue(true)}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('Fibres 1,5 g')).toBeInTheDocument();
    expect(screen.getByText('Sel 0,12 g')).toBeInTheDocument();
  });

  it('normalise les actions et demande une confirmation avant archivage', async () => {
    const user = userEvent.setup();
    const onArchive = renderCard();

    await user.click(screen.getByRole('button', { name: 'Actions pour Yaourt grec' }));
    const menu = screen.getByRole('menu', { name: 'Actions pour Yaourt grec' });
    expect(within(menu).getAllByRole('menuitem').map((item) => item.textContent))
      .toEqual(['Modifier', 'Archiver']);
    expect(within(menu).getByRole('separator')).toBeInTheDocument();
    expect(within(menu).getByRole('menuitem', { name: 'Modifier' })).toHaveAttribute(
      'href',
      '/food/products/product-1/edit',
    );

    await user.click(within(menu).getByRole('menuitem', { name: 'Archiver' }));
    const dialog = screen.getByRole('alertdialog', { name: 'Archiver cet aliment ?' });
    await user.click(within(dialog).getByRole('button', { name: 'Archiver' }));

    await waitFor(() => expect(onArchive).toHaveBeenCalledWith('product-1'));
  });
});
