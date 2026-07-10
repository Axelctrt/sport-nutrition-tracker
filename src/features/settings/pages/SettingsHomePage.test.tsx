import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { SettingsHomePage } from '@/features/settings/pages/SettingsHomePage';

const dataSpace = {
  id: 'guest' as const,
  kind: 'guest' as const,
  databaseName: 'test-settings-home',
  label: 'Mode local',
  createdAt: '2026-07-10T10:00:00.000Z',
  lastActivatedAt: '2026-07-10T10:00:00.000Z',
};

describe('SettingsHomePage', () => {
  it('présente les catégories principales et sépare les diagnostics avancés', async () => {
    render(
      <MemoryRouter>
        <SettingsHomePage
          settingsRepository={{ get: async () => createDefaultAppSettings() }}
          readStorageStatus={async () => 'persisted'}
          dataSpace={dataSpace}
        />
      </MemoryRouter>,
    );

    expect(await screen.findByRole('heading', { name: 'Paramètres', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Profil et objectifs/ })).toHaveAttribute(
      'href',
      '/settings/profile-objectives',
    );
    expect(screen.getByRole('link', { name: /Données, sauvegardes et export/ })).toHaveAttribute(
      'href',
      '/settings/data-backup',
    );
    expect(screen.getByRole('link', { name: 'Ouvrir la section avancée' })).toHaveAttribute(
      'href',
      '/settings/advanced',
    );
  });
});
