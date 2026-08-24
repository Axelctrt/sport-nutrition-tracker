import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActivitySyncSettingsPanel } from '@/features/settings/components/ActivitySyncSettingsPanel';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

type Origin = 'local' | 'cloud' | 'both' | 'unknown';

function createClient(origin: Origin = 'local') {
  const listeners = new Set<() => void>();
  const preview = {
    localActivityCount: 2,
    cloudActivityCount: 1,
    localEndurancePlanningCount: 1,
    cloudEndurancePlanningCount: 1,
    localDeletionCount: 0,
    cloudDeletionCount: 0,
    differingEntityCount: 1,
    changeOrigin: origin,
  } as const;
  let snapshot: SyncPrototypeSnapshot = {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      email: 'sportpilot@example.com',
    },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realActivities: { enabled: true, status: 'ready', preview },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };
  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealActivities = vi.fn(async () => preview);
  const syncRealActivities = vi.fn(async () => {
    const result = {
      ...preview,
      uploadedActivities: origin === 'local' ? 1 : 0,
      downloadedActivities: origin === 'cloud' ? 1 : 0,
      uploadedEndurancePlanningSessions: 0,
      downloadedEndurancePlanningSessions: 0,
      removedLocalEndurancePlanningSessions: 0,
      removedCloudEndurancePlanningSessions: 0,
      removedLocalActivities: 0,
      removedCloudActivities: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-08-18T13:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realActivities: {
        enabled: true,
        status: 'ready',
        preview,
        lastResult: result,
      },
    };
    notify();
    return result;
  });
  const client = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    analyzeRealActivities,
    syncRealActivities,
  } as unknown as SyncPrototypeClient;
  return { client, analyzeRealActivities, syncRealActivities };
}

describe('ActivitySyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque le lot sportif est indisponible', () => {
    render(
      <MemoryRouter>
        <ActivitySyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Synchronisation sportive non activée')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gérer le compte de synchronisation' }))
      .toHaveAttribute('href', '/settings/account-devices');
  });

  it('expose activités, planning et provenance puis synchronise seulement local/cloud', async () => {
    const user = userEvent.setup();
    const { client, syncRealActivities } = createClient('local');
    render(
      <MemoryRouter>
        <ActivitySyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    expect(screen.getByText('local — cet appareil')).toBeInTheDocument();
    expect(screen.getByText('Planning local')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Synchroniser les activités' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/seule la direction cet appareil vers le cloud/i))
      .toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Synchroniser' }));
    await waitFor(() => expect(syncRealActivities).toHaveBeenCalledTimes(1));
  });

  it.each([
    ['unknown', /origine indéterminée/i],
    ['both', /modifications des deux côtés/i],
  ] as const)('reste sans action d’écriture pour %s', (origin, notice) => {
    const { client } = createClient(origin);
    render(
      <MemoryRouter>
        <ActivitySyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    expect(screen.getAllByText(notice).length).toBeGreaterThan(0);
    expect(screen.queryByRole('button', { name: 'Synchroniser les activités' }))
      .not.toBeInTheDocument();
  });
});
