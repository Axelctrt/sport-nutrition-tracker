import { cleanup, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WeightSyncSettingsPanel } from '@/features/settings/components/WeightSyncSettingsPanel';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const integrationMocks = vi.hoisted(() => {
  const snapshot = {
    available: false,
    enabled: false,
    accountConnected: false,
    online: true,
    status: 'unavailable' as const,
    errorMessage: 'VITE_DEXIE_CLOUD_DATABASE_URL est obligatoire.',
  };

  return {
    initialize: vi.fn(async () => undefined),
    subscribe: vi.fn(() => () => undefined),
    getSnapshot: vi.fn(() => snapshot),
    setEnabled: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
  };
});

vi.mock(
  '@/infrastructure/sync-prototype/weightSyncIntegration',
  () => ({
    getWeightSyncIntegration: () => integrationMocks,
  }),
);

afterEach(cleanup);

describe('WeightSyncSettingsPanel', () => {
  it('conserve l’accès au compte même si la configuration est invalide', async () => {
    render(
      <MemoryRouter>
        <ToastProvider>
          <WeightSyncSettingsPanel />
        </ToastProvider>
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Configuration de synchronisation invalide'),
    ).toBeInTheDocument();

    const link = screen.getByRole('link', {
      name: 'Gérer le compte de synchronisation',
    });

    expect(link).toHaveAttribute('href', '/settings/sync-prototype');
    await waitFor(() => expect(integrationMocks.initialize).toHaveBeenCalled());
  });
});
