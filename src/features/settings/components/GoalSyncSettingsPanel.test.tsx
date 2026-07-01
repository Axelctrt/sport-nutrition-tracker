import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GoalSyncSettingsPanel } from '@/features/settings/components/GoalSyncSettingsPanel';
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
    realGoals: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };

  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealGoals = vi.fn(async () => {
    const preview = {
      localGoalCount: 2,
      cloudGoalCount: 1,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 1,
    };
    snapshot = {
      ...snapshot,
      realGoals: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealGoals = vi.fn(async () => {
    const preview = {
      localGoalCount: 2,
      cloudGoalCount: 2,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    };
    const result = {
      ...preview,
      uploadedGoals: 1,
      downloadedGoals: 0,
      removedLocalGoals: 0,
      removedCloudGoals: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-07-01T12:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realGoals: {
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
    analyzeRealGoals,
    syncRealGoals,
    saveWeight: vi.fn(async () => {
      throw new Error('Non utilisé');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return { client, analyzeRealGoals, syncRealGoals };
}

describe('GoalSyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque B2 est indisponible', () => {
    render(
      <MemoryRouter>
        <GoalSyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Synchronisation sportive non activée'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'Gérer le compte de synchronisation',
    })).toHaveAttribute('href', '/settings/account-devices');
  });

  it('analyse puis synchronise les objectifs après confirmation', async () => {
    const user = userEvent.setup();
    const { client, analyzeRealGoals, syncRealGoals } = createClient();

    render(
      <MemoryRouter>
        <GoalSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(client.initialize).toHaveBeenCalledTimes(1),
    );

    await user.click(screen.getByRole('button', {
      name: 'Analyser sans modifier',
    }));

    await waitFor(() =>
      expect(analyzeRealGoals).toHaveBeenCalledTimes(1),
    );
    expect(screen.getByText('1 objectif diffère entre cet appareil et le cloud.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Synchroniser les objectifs',
    }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() =>
      expect(syncRealGoals).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('1 objectif mis à jour et 0 suppression appliquée.'),
    ).toBeInTheDocument();
  });
});
