import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NutritionJournalSyncSettingsPanel } from '@/features/settings/components/NutritionJournalSyncSettingsPanel';
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
    realNutritionJournal: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };

  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealNutritionJournal = vi.fn(async () => {
    const preview = {
      localDayCount: 2,
      cloudDayCount: 1,
      localEntryCount: 4,
      cloudEntryCount: 2,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 1,
    };
    snapshot = {
      ...snapshot,
      realNutritionJournal: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealNutritionJournal = vi.fn(async () => {
    const preview = {
      localDayCount: 2,
      cloudDayCount: 2,
      localEntryCount: 4,
      cloudEntryCount: 4,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    };
    const result = {
      ...preview,
      uploadedDays: 1,
      downloadedDays: 0,
      uploadedEntities: 3,
      downloadedEntities: 0,
      removedLocalEntities: 0,
      removedCloudEntities: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-07-01T12:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realNutritionJournal: {
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
    analyzeRealNutritionJournal,
    syncRealNutritionJournal,
    saveWeight: vi.fn(async () => {
      throw new Error('Non utilisé');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return {
    client,
    analyzeRealNutritionJournal,
    syncRealNutritionJournal,
  };
}

describe('NutritionJournalSyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque C1 est indisponible', () => {
    render(
      <MemoryRouter>
        <NutritionJournalSyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Synchronisation nutritionnelle non activée'),
    ).toBeInTheDocument();
    expect(screen.getByRole('link', {
      name: 'Gérer le compte de synchronisation',
    })).toHaveAttribute('href', '/settings/account-devices');
  });

  it('analyse puis synchronise le journal après confirmation', async () => {
    const user = userEvent.setup();
    const {
      client,
      analyzeRealNutritionJournal,
      syncRealNutritionJournal,
    } = createClient();

    render(
      <MemoryRouter>
        <NutritionJournalSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(client.initialize).toHaveBeenCalledTimes(1),
    );

    await user.click(screen.getByRole('button', {
      name: 'Analyser sans modifier',
    }));

    await waitFor(() =>
      expect(analyzeRealNutritionJournal).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('1 élément diffère entre cet appareil et le cloud.'),
    ).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Synchroniser le journal nutritionnel',
    }));
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() =>
      expect(syncRealNutritionJournal).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('3 éléments mis à jour et 0 suppression appliquée.'),
    ).toBeInTheDocument();
  });
});
