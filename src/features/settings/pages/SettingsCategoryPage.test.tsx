import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { SettingsCategoryPage } from '@/features/settings/pages/SettingsCategoryPage';

vi.mock('@/application/daily/settingsTargetRecalculationService', () => ({
  recalculateExistingTargetsAfterSettingsChange: vi.fn().mockResolvedValue(undefined),
}));

const settingsRepository = {
  get: async () => createDefaultAppSettings(),
  update: async () => createDefaultAppSettings(),
  reset: async () => createDefaultAppSettings(),
};

function renderPage(pathname: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[pathname]}>
        <SettingsCategoryPage
          settingsRepository={settingsRepository}
          readStorageStatus={async () => 'persisted'}
          persistStorage={async () => 'persisted'}
        />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe('SettingsCategoryPage', () => {
  it('affiche la catégorie À propos et ses destinations utiles', async () => {
    renderPage('/settings/about');

    expect(await screen.findByRole('heading', { name: 'À propos de SportPilot', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Confidentialité/ })).toHaveAttribute('href', '/privacy');
    expect(screen.getByRole('link', { name: /Diagnostics avancés/ })).toHaveAttribute('href', '/settings/advanced');
  });

  it('présente un accès standard au compte avant les détails avancés', async () => {
    renderPage('/settings/account-sync');

    expect(await screen.findByRole('heading', { name: 'Compte et synchronisation', level: 1 })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Compte et synchronisation/ }))
      .toHaveAttribute('href', '/settings/sync-prototype');
    expect(screen.getByRole('link', { name: /Appareils et données locales/ }))
      .toHaveAttribute('href', '/settings/account-devices');
    expect(screen.getByText('Gérer la continuité du compte')).toBeInTheDocument();
    expect(screen.getByText(/différences, actions manuelles et diagnostics/i))
      .toBeInTheDocument();
    expect(screen.queryByText(/Synchronisation automatique (?:active|désactivée)/i))
      .not.toBeInTheDocument();
  });

  it('affiche localement le résultat de la sauvegarde des réglages', async () => {
    const user = userEvent.setup();
    renderPage('/settings/notifications-routines');

    await user.click(
      await screen.findByRole('button', { name: 'Enregistrer les paramètres' }),
    );

    expect(
      await screen.findByText(
        'Les réglages de cette catégorie ont été enregistrés.',
      ),
    ).toBeInTheDocument();
  });

  it('signale une route de catégorie inconnue sans rendre un écran vide', async () => {
    renderPage('/settings/inconnue');
    expect(await screen.findByText('Cette catégorie de paramètres n’existe pas.')).toBeInTheDocument();
  });
});