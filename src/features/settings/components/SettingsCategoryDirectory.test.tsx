import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { SettingsCategoryDirectory } from '@/features/settings/components/SettingsCategoryDirectory';

const categories = [
  {
    id: 'appearance-accessibility' as const,
    path: '/settings/appearance-accessibility',
    title: 'Apparence et accessibilité',
    description: 'Thème et confort.',
    keywords: ['sombre'],
    summary: 'Thème sombre',
  },
  {
    id: 'data-backup' as const,
    path: '/settings/data-backup',
    title: 'Données, sauvegardes et export',
    description: 'Sauvegarde locale.',
    keywords: ['json'],
    summary: 'Dernière sauvegarde disponible',
  },
];

describe('SettingsCategoryDirectory', () => {
  it('filtre les catégories à partir du titre, des mots-clés et du résumé', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsCategoryDirectory categories={categories} />
      </MemoryRouter>,
    );

    await user.type(screen.getByRole('searchbox', { name: 'Rechercher dans les paramètres' }), 'sombre');

    expect(screen.getByRole('link', { name: /Apparence et accessibilité/ })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: /Données, sauvegardes/ })).not.toBeInTheDocument();
  });

  it('conserve une destination dédiée par catégorie', () => {
    render(
      <MemoryRouter>
        <SettingsCategoryDirectory categories={categories} />
      </MemoryRouter>,
    );

    expect(screen.getByRole('link', { name: /Données, sauvegardes/ })).toHaveAttribute(
      'href',
      '/settings/data-backup',
    );
  });

  it('distingue un annuaire indisponible sans proposer de faux reset', () => {
    render(
      <MemoryRouter>
        <SettingsCategoryDirectory categories={[]} />
      </MemoryRouter>,
    );

    expect(
      screen
        .getByRole('heading', { name: 'Aucune catégorie disponible' })
        .closest('[data-empty-state-variant]'),
    ).toHaveAttribute('data-empty-state-variant', 'unavailable');
    expect(
      screen.queryByRole('button', { name: 'Effacer la recherche' }),
    ).not.toBeInTheDocument();
  });

  it('rend une recherche vide réinitialisable sans modifier les catégories', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <SettingsCategoryDirectory categories={categories} />
      </MemoryRouter>,
    );
    const search = screen.getByRole('searchbox', {
      name: 'Rechercher dans les paramètres',
    });

    await user.type(search, 'introuvable');

    expect(
      screen
        .getByRole('heading', { name: 'Aucun réglage trouvé' })
        .closest('[data-empty-state-variant]'),
    ).toHaveAttribute('data-empty-state-variant', 'filtered');

    await user.click(
      screen.getByRole('button', { name: 'Effacer la recherche' }),
    );

    expect(search).toHaveValue('');
    expect(screen.getAllByRole('link')).toHaveLength(categories.length);
    expect(categories).toHaveLength(2);
  });
});
