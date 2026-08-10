import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultAppSettings } from '@/domain/defaults/appSettings';
import { DashboardCustomizationPage } from '@/features/dashboard-customization/pages/DashboardCustomizationPage';
import { repositories } from '@/infrastructure/repositories/repositories';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const settings = createDefaultAppSettings();

function renderPage() {
  render(
    <MemoryRouter>
      <ToastProvider>
        <DashboardCustomizationPage />
      </ToastProvider>
    </MemoryRouter>,
  );
}

describe('DashboardCustomizationPage', () => {
  beforeEach(() => {
    vi.spyOn(repositories.settings, 'get').mockResolvedValue(settings);
    vi.spyOn(repositories.settings, 'update').mockResolvedValue(settings);
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('reste silencieuse au chargement puis affiche un seul succès local', async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByRole('heading', { name: 'Affichage de l’Accueil' });
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(repositories.settings.update).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status')).toHaveTextContent('Personnalisation enregistrée');
  });

  it('affiche une seule erreur locale lorsque l’enregistrement échoue', async () => {
    const user = userEvent.setup();
    vi.mocked(repositories.settings.update).mockRejectedValue(new Error('Stockage indisponible'));
    renderPage();

    await user.click(await screen.findByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(repositories.settings.update).toHaveBeenCalledTimes(1));
    expect(screen.getAllByRole('alert')).toHaveLength(1);
    expect(screen.getByRole('alert')).toHaveTextContent('Stockage indisponible');
  });
});
