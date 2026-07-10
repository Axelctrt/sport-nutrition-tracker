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
});
