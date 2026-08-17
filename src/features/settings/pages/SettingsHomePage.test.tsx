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
  it('présente exactement cinq catégories simples sans métriques techniques', async () => {
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
    expect(screen.getByRole('link', { name: /Profil et objectif nutritionnel/ })).toHaveAttribute(
      'href',
      '/settings/profile-objectives',
    );
    expect(screen.getByRole('link', { name: /Confidentialité et données/ })).toHaveAttribute(
      'href',
      '/settings/data-backup',
    );
    expect(screen.getByRole('link', { name: /À propos et réglages avancés/ }))
      .toHaveAttribute('href', '/settings/about');
    expect(screen.getAllByRole('link')).toHaveLength(5);
    expect(screen.queryByText(/IndexedDB|file d’attente|conflit|runtime|snapshot/i))
      .not.toBeInTheDocument();
  });

  it('décrit un espace de compte sans déduire son état du booléen d’automatisation', async () => {
    const accountSpace = {
      id: 'account:settings-home' as const,
      kind: 'account' as const,
      databaseName: 'test-settings-home-account',
      label: 'Espace du compte',
      accountFingerprint: 'settings-home',
      linkedToCurrentDevice: true,
      createdAt: '2026-07-10T10:00:00.000Z',
      lastActivatedAt: '2026-07-10T10:00:00.000Z',
    };

    render(
      <MemoryRouter>
        <SettingsHomePage
          settingsRepository={{
            get: async () => ({
              ...createDefaultAppSettings(),
              automaticAccountSyncEnabled: false,
            }),
          }}
          readStorageStatus={async () => 'persisted'}
          dataSpace={accountSpace}
        />
      </MemoryRouter>,
    );

    expect(await screen.findAllByText(/Gérer la continuité du compte/i))
      .toHaveLength(2);
    expect(screen.queryByText(/synchronisation (?:automatique )?(?:active|manuelle|désactivée)/i))
      .not.toBeInTheDocument();
  });
});
