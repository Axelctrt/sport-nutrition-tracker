import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { ActivitySyncSettingsPanel } from '@/features/settings/components/ActivitySyncSettingsPanel';
import {
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

function createClient() {
  const listeners = new Set<() => void>();
  let snapshot: SyncPrototypeSnapshot = {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: 'user-1',
      email: 'sportpilot@example.com',
    },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realActivities: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };

  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealActivities = vi.fn(async () => {
    const preview = {
      localActivityCount: 2,
      cloudActivityCount: 1,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 1,
    };
    snapshot = {
      ...snapshot,
      realActivities: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealActivities = vi.fn(async () => {
    const preview = {
      localActivityCount: 2,
      cloudActivityCount: 2,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    };
    const result = {
      ...preview,
      uploadedActivities: 1,
      downloadedActivities: 0,
      removedLocalActivities: 0,
      removedCloudActivities: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-07-01T12:00:00.000Z',
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

  const client: SyncPrototypeClient = {
    getSnapshot: () => snapshot,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    logout: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    })),
    syncRealWeights: vi.fn(async () => ({
      localWeightCount: 0,
      cloudWeightCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
      uploadedWeights: 0,
      downloadedWeights: 0,
      removedLocalWeights: 0,
      removedCloudWeights: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-07-01T12:00:00.000Z',
    })),
    analyzeRealActivities,
    syncRealActivities,
    saveWeight: vi.fn(async () => {
      throw new Error('Non utilisé');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return { client, analyzeRealActivities, syncRealActivities };
}

describe('ActivitySyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque le lot sportif est indisponible', () => {
    render(
      <MemoryRouter>
        <ActivitySyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Synchronisation sportive non activée'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'Gérer le compte de synchronisation',
    })).toHaveAttribute('href', '/settings/sync-prototype');
  });

  it('analyse puis synchronise les activités après confirmation', async () => {
    const user = userEvent.setup();
    const { client, analyzeRealActivities, syncRealActivities } = createClient();

    render(
      <MemoryRouter>
        <ActivitySyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(client.initialize).toHaveBeenCalledTimes(1),
    );

    await user.click(screen.getByRole('button', {
      name: 'Analyser sans modifier',
    }));

    await waitFor(() =>
      expect(analyzeRealActivities).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByText('1 activité diffère entre cet appareil et le cloud.')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Synchroniser les activités',
    }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() =>
      expect(syncRealActivities).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('1 activité mise à jour et 0 suppression appliquée.'),
    ).toBeInTheDocument();
  });
});
