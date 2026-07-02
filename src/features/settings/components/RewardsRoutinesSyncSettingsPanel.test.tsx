import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';

import { RewardsRoutinesSyncSettingsPanel } from '@/features/settings/components/RewardsRoutinesSyncSettingsPanel';
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
    realRewardsRoutines: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };
  const notify = () => listeners.forEach((listener) => listener());
  const preview = {
    localAchievementCount: 2,
    cloudAchievementCount: 1,
    localUnlockedThemeCount: 2,
    cloudUnlockedThemeCount: 1,
    localWeeklyMissionCount: 1,
    cloudWeeklyMissionCount: 0,
    localReminderCompletionCount: 1,
    cloudReminderCompletionCount: 0,
    cloudStatePresent: true,
    differingEntityCount: 4,
  };
  const analyzeRealRewardsRoutines = vi.fn(async () => {
    snapshot = {
      ...snapshot,
      realRewardsRoutines: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealRewardsRoutines = vi.fn(async () => {
    const readyPreview = { ...preview, differingEntityCount: 0 };
    const result = {
      ...readyPreview,
      uploadedAchievements: 1,
      downloadedAchievements: 0,
      uploadedThemes: 1,
      downloadedThemes: 0,
      uploadedThemePreference: 0,
      downloadedThemePreference: 0,
      uploadedWeeklyMissions: 1,
      downloadedWeeklyMissions: 0,
      uploadedReminderCompletions: 1,
      downloadedReminderCompletions: 0,
      uploadedReminderPreferences: 0,
      downloadedReminderPreferences: 0,
      completedAt: '2026-07-02T12:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realRewardsRoutines: {
        enabled: true,
        status: 'ready',
        preview: readyPreview,
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
      completedAt: '2026-07-02T12:00:00.000Z',
    })),
    analyzeRealRewardsRoutines,
    syncRealRewardsRoutines,
    saveWeight: vi.fn(async () => { throw new Error('Non utilisé'); }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return { client, analyzeRealRewardsRoutines, syncRealRewardsRoutines };
}

describe('RewardsRoutinesSyncSettingsPanel', () => {
  it('explique que le domaine reste local lorsqu’il est désactivé', () => {
    render(
      <MemoryRouter>
        <RewardsRoutinesSyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(screen.getByText('Récompenses et rappels non activés')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Gérer le compte de synchronisation' }))
      .toHaveAttribute('href', '/settings/account-devices');
  });

  it('analyse puis fusionne la progression après confirmation', async () => {
    const user = userEvent.setup();
    const { client, analyzeRealRewardsRoutines, syncRealRewardsRoutines } = createClient();

    render(
      <MemoryRouter>
        <RewardsRoutinesSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    expect(screen.getByText(/Fusion non destructive/)).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Analyser sans modifier' }));
    await waitFor(() => expect(analyzeRealRewardsRoutines).toHaveBeenCalledTimes(1));
    expect(screen.getByText('4 éléments diffèrent entre cet appareil et le cloud.')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Synchroniser les récompenses et rappels' }));
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));
    await waitFor(() => expect(syncRealRewardsRoutines).toHaveBeenCalledTimes(1));
    expect(screen.getByText('4 éléments mis à jour.')).toBeInTheDocument();
  });
});
