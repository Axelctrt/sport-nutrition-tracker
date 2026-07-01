import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { StrengthSyncSettingsPanel } from '@/features/settings/components/StrengthSyncSettingsPanel';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
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
    realStrength: { enabled: true, status: 'idle' },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };

  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealStrength = vi.fn(async () => {
    const preview = {
      localCustomExerciseCount: 1,
      cloudCustomExerciseCount: 1,
      localTemplateCount: 1,
      cloudTemplateCount: 1,
      localSessionCount: 1,
      cloudSessionCount: 0,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 1,
    };
    snapshot = {
      ...snapshot,
      realStrength: { enabled: true, status: 'ready', preview },
    };
    notify();
    return preview;
  });
  const syncRealStrength = vi.fn(async () => {
    const preview = {
      localCustomExerciseCount: 1,
      cloudCustomExerciseCount: 1,
      localTemplateCount: 1,
      cloudTemplateCount: 1,
      localSessionCount: 1,
      cloudSessionCount: 1,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 0,
    };
    const result = {
      ...preview,
      uploadedExercises: 0,
      downloadedExercises: 0,
      uploadedTemplates: 0,
      downloadedTemplates: 0,
      uploadedSessions: 1,
      downloadedSessions: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-07-01T12:00:00.000Z',
    };
    snapshot = {
      ...snapshot,
      realStrength: {
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
    analyzeRealStrength,
    syncRealStrength,
    saveWeight: vi.fn(async () => {
      throw new Error('Non utilisé');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return { client, analyzeRealStrength, syncRealStrength };
}

describe('StrengthSyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque B3 est indisponible', () => {
    render(
      <MemoryRouter>
        <StrengthSyncSettingsPanel client={null} />
      </MemoryRouter>,
    );

    expect(
      screen.getByText('Synchronisation sportive non activée'),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', {
        name: 'Gérer le compte de synchronisation',
      }),
    ).toHaveAttribute('href', '/settings/sync-prototype');
  });

  it('analyse puis synchronise les agrégats après confirmation', async () => {
    const user = userEvent.setup();
    const { client, analyzeRealStrength, syncRealStrength } = createClient();

    render(
      <MemoryRouter>
        <StrengthSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() =>
      expect(client.initialize).toHaveBeenCalledTimes(1),
    );

    await user.click(
      screen.getByRole('button', { name: 'Analyser sans modifier' }),
    );

    await waitFor(() =>
      expect(analyzeRealStrength).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('1 élément diffère entre cet appareil et le cloud.'),
    ).toBeInTheDocument();

    await user.click(
      screen.getByRole('button', { name: 'Synchroniser la musculation' }),
    );
    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() =>
      expect(syncRealStrength).toHaveBeenCalledTimes(1),
    );
    expect(
      screen.getByText('1 agrégat mis à jour et 0 suppression appliquée.'),
    ).toBeInTheDocument();
  });
});
