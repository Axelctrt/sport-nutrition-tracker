import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { NutritionTrackingSyncSettingsPanel } from '@/features/settings/components/NutritionTrackingSyncSettingsPanel';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

function createClient() {
  const listeners = new Set<() => void>();
  let snapshot: SyncPrototypeSnapshot = {
    account: { isLoggedIn: true, isLoading: false, userId: 'user-1' },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    realNutritionTracking: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };
  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealNutritionTracking = vi.fn(async () => {
    const preview = {
      localReviewCount: 1,
      cloudReviewCount: 0,
      localAdjustmentCount: 1,
      cloudAdjustmentCount: 0,
      differingEntityCount: 1,
    };
    snapshot = {
      ...snapshot,
      realNutritionTracking: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealNutritionTracking = vi.fn(async () => {
    const preview = {
      localReviewCount: 1,
      cloudReviewCount: 1,
      localAdjustmentCount: 1,
      cloudAdjustmentCount: 1,
      differingEntityCount: 0,
    };
    const result = {
      ...preview,
      uploadedReviews: 1,
      downloadedReviews: 0,
      uploadedAdjustments: 1,
      downloadedAdjustments: 0,
      recalculatedDailyTargets: 2,
      completedAt: '2026-07-01T12:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realNutritionTracking: {
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
    analyzeRealNutritionTracking,
    syncRealNutritionTracking,
    saveWeight: vi.fn(async () => { throw new Error('Non utilisé'); }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return { client, analyzeRealNutritionTracking, syncRealNutritionTracking };
}

describe('NutritionTrackingSyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque C3 est indisponible', () => {
    render(
      <MemoryRouter>
        <NutritionTrackingSyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Suivi nutritionnel non activé')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gérer le compte de synchronisation' }))
      .toHaveAttribute('href', '/settings/sync-prototype');
  });

  it('analyse puis synchronise le suivi après confirmation', async () => {
    const user = userEvent.setup();
    const { client, analyzeRealNutritionTracking, syncRealNutritionTracking } = createClient();

    render(
      <MemoryRouter>
        <NutritionTrackingSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole('button', { name: 'Analyser sans modifier' }));
    await waitFor(() => expect(analyzeRealNutritionTracking).toHaveBeenCalledTimes(1));
    expect(screen.getByText('1 élément diffère entre cet appareil et le cloud.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Synchroniser le suivi nutritionnel' }));
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));
    await waitFor(() => expect(syncRealNutritionTracking).toHaveBeenCalledTimes(1));
    expect(screen.getByText('1 bilan mis à jour et 2 objectifs quotidiens recalculés.')).toBeInTheDocument();
  });
});
