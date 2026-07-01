import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { ComponentProps } from 'react';
import { MemoryRouter } from 'react-router-dom';

import type { DataSpaceDescriptor } from '@/domain/data-spaces/dataSpace';
import { AccountDevicesPage } from '@/features/account-devices/pages/AccountDevicesPage';
import type { CurrentDeviceDescriptor } from '@/infrastructure/devices/currentDeviceRegistry';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';

const accountSpace: DataSpaceDescriptor = {
  id: 'account:acct-a1b2c3d4',
  kind: 'account',
  databaseName: 'sportpilot-local-database--acct-a1b2c3d4',
  label: 'Espace de compte',
  accountFingerprint: 'acct-a1b2c3d4',
  linkedToCurrentDevice: true,
  createdAt: '2026-07-01T08:00:00.000Z',
  lastActivatedAt: '2026-07-01T09:00:00.000Z',
};

const currentDevice: CurrentDeviceDescriptor = {
  id: 'device-abcdef01-2345-6789-abcd-ef0123456789',
  label: 'Chrome sur Windows',
  platform: 'Windows',
  browser: 'Chrome',
  createdAt: '2026-07-01T08:00:00.000Z',
  lastSeenAt: '2026-07-01T10:00:00.000Z',
};

function createSnapshot(): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'user-1',
    },
    sync: {
      status: 'connected',
      phase: 'in-sync',
    },
    weights: {
      weights: [],
      deletedCount: 0,
      isLoading: false,
    },
    realWeights: {
      enabled: true,
      status: 'idle',
    },
    diagnostics: {
      databaseName: 'sportpilot-sync-prototype-test',
      databaseVersion: 2,
      visibleWeightCount: 0,
      deletedWeightCount: 0,
      accountFingerprint: 'acct-a1b2c3d4',
      lastSyncCompletedAt: '2026-07-01T09:45:00.000Z',
    },
  };
}

function createClient(): SyncPrototypeClient {
  const snapshot = createSnapshot();
  return {
    getSnapshot: () => snapshot,
    subscribe: vi.fn(() => () => undefined),
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    logout: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn() as SyncPrototypeClient['analyzeRealWeights'],
    syncRealWeights: vi.fn() as SyncPrototypeClient['syncRealWeights'],
    saveWeight: vi.fn() as SyncPrototypeClient['saveWeight'],
    deleteWeight: vi.fn(async () => undefined),
  };
}

function renderPage(overrides: Partial<ComponentProps<typeof AccountDevicesPage>> = {}) {
  return render(
    <MemoryRouter>
      <AccountDevicesPage
        client={createClient()}
        currentSpace={accountSpace}
        currentDevice={currentDevice}
        reload={vi.fn()}
        {...overrides}
      />
    </MemoryRouter>,
  );
}

describe('AccountDevicesPage', () => {
  it('affiche le compte, la synchronisation et l’appareil actuel', async () => {
    renderPage();

    expect(
      await screen.findByRole('heading', { name: 'Compte et appareils' }),
    ).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
    expect(screen.getByText('À jour')).toBeInTheDocument();
    expect(screen.getByText('Chrome sur Windows')).toBeInTheDocument();
    expect(screen.getByText('…23456789')).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'Exporter les données' }),
    ).toHaveAttribute('href', '/backup');
  });

  it('déconnecte sans supprimer les données locales', async () => {
    const disconnect = vi.fn(async () => undefined);
    const reload = vi.fn();
    renderPage({ disconnect, reload });

    await userEvent.click(await screen.findByRole('button', { name: 'Déconnecter' }));
    await userEvent.click(
      within(screen.getByRole('alertdialog')).getByRole('button', {
        name: 'Déconnecter',
      }),
    );

    await waitFor(() => expect(disconnect).toHaveBeenCalledTimes(1));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('désassocie l’appareil avec une confirmation distincte', async () => {
    const detachDevice = vi.fn(async () => accountSpace);
    const reload = vi.fn();
    renderPage({ detachDevice, reload });

    await userEvent.click(
      await screen.findByRole('button', { name: 'Désassocier l’appareil' }),
    );
    await userEvent.click(screen.getByRole('button', { name: 'Désassocier' }));

    await waitFor(() => expect(detachDevice).toHaveBeenCalledTimes(1));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('exige le mot SUPPRIMER avant la suppression locale', async () => {
    const deleteLocalData = vi.fn(async () => ({
      databaseName: accountSpace.databaseName,
    }));
    const reload = vi.fn();
    renderPage({ deleteLocalData, reload });

    const deleteButton = await screen.findByRole('button', {
      name: 'Supprimer sur cet appareil',
    });
    expect(deleteButton).toBeDisabled();

    await userEvent.type(screen.getByLabelText('Saisis SUPPRIMER'), 'SUPPRIMER');
    expect(deleteButton).toBeEnabled();
    await userEvent.click(deleteButton);
    await userEvent.click(
      screen.getByRole('button', { name: 'Supprimer définitivement en local' }),
    );

    await waitFor(() => expect(deleteLocalData).toHaveBeenCalledTimes(1));
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
