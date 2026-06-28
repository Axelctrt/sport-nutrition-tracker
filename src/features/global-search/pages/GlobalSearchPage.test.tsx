import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import type { GlobalSearchResult } from '@/application/search/globalSearchService';
import type { RecentSearchStorage } from '@/application/search/recentSearches';
import { GlobalSearchPage } from '@/features/global-search/pages/GlobalSearchPage';

const results: GlobalSearchResult[] = [
  {
    id: 'product-1',
    category: 'foodProduct',
    title: 'Banane',
    subtitle: 'Marché · 89 kcal / 100 g',
    path: '/food/products/product-1/edit',
    keywords: ['Marché'],
  },
  {
    id: 'recipe-1',
    category: 'recipe',
    title: 'Porridge banane',
    subtitle: '1 portion',
    path: '/recipes/recipe-1/edit',
    keywords: ['Petit-déjeuner'],
  },
];

function memoryStorage(): RecentSearchStorage & {
  values: Map<string, string>;
} {
  const values = new Map<string, string>();

  return {
    values,
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

describe('GlobalSearchPage', () => {
  it('recherche, filtre et mémorise une requête', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();

    render(
      <MemoryRouter initialEntries={['/search']}>
        <GlobalSearchPage
          loadIndex={() => Promise.resolve(results)}
          recentStorage={storage}
        />
      </MemoryRouter>,
    );

    const input = await screen.findByRole('searchbox', {
      name: 'Rechercher dans SportPilot',
    });

    await user.type(input, 'banane');

    expect(screen.getByText('Banane')).toBeInTheDocument();
    expect(
      screen.getByText('Porridge banane'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Recettes (1)',
      }),
    );

    expect(
      screen.queryByText('Banane'),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('Porridge banane'),
    ).toBeInTheDocument();

    fireEvent.submit(input.closest('form')!);

    await waitFor(() => {
      expect(
        [...storage.values.values()].join(' '),
      ).toContain('banane');
    });
  });

  it('affiche et efface les recherches récentes', async () => {
    const user = userEvent.setup();
    const storage = memoryStorage();

    storage.setItem(
      'sportpilot.globalSearch.recent',
      JSON.stringify(['séance push']),
    );

    render(
      <MemoryRouter initialEntries={['/search']}>
        <GlobalSearchPage
          loadIndex={() => Promise.resolve(results)}
          recentStorage={storage}
        />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('button', {
        name: 'séance push',
      }),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', {
        name: 'Effacer les recherches récentes',
      }),
    );

    expect(
      screen.queryByRole('button', {
        name: 'séance push',
      }),
    ).not.toBeInTheDocument();
  });

  it('affiche un état vide explicite', async () => {
    const user = userEvent.setup();

    render(
      <MemoryRouter initialEntries={['/search']}>
        <GlobalSearchPage
          loadIndex={() => Promise.resolve(results)}
        />
      </MemoryRouter>,
    );

    await user.type(
      await screen.findByRole('searchbox', {
        name: 'Rechercher dans SportPilot',
      }),
      'introuvable',
    );

    expect(
      screen.getByText('Aucun résultat'),
    ).toBeInTheDocument();
  });
});
