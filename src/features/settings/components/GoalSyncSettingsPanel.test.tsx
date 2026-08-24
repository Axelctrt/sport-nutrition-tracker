import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GoalSyncSettingsPanel } from '@/features/settings/components/GoalSyncSettingsPanel';
import type {
  PreparedRealGoalConcurrentReconciliation,
} from '@/infrastructure/sync-prototype/realGoalConcurrentResolutionService';
import type {
  PreparedRealGoalReconciliation,
  RealGoalSyncResult,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import {
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

type Origin = 'local' | 'cloud' | 'both' | 'unknown';

function createClient(origin: Origin = 'local') {
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
    realGoals: {
      enabled: true,
      status: 'ready',
      preview: {
        localGoalCount: 2,
        cloudGoalCount: 1,
        localDeletionCount: 0,
        cloudDeletionCount: 0,
        differingEntityCount: 1,
        changeOrigin: origin,
      },
    },
    diagnostics: createEmptySyncPrototypeDiagnostics('user-1'),
  };

  const notify = () => listeners.forEach((listener) => listener());
  const analyzeRealGoals = vi.fn(async () => {
    const preview = snapshot.realGoals!.preview!;
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
    const result: RealGoalSyncResult = {
      ...preview,
      changeOrigin: origin,
      uploadedGoals: origin === 'local' ? 1 : 0,
      downloadedGoals: origin === 'cloud' ? 1 : 0,
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

  const client = {
    getSnapshot: () => snapshot,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    initialize: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealGoals,
    syncRealGoals,
  } as unknown as SyncPrototypeClient;

  return { client, analyzeRealGoals, syncRealGoals };
}

function reconciliationItem() {
  return {
    id: 'goal-legacy',
    title: 'Courir 50 km',
    localStatus: 'modified' as const,
    cloudStatus: 'present' as const,
    keepLocalConsequence: 'La version de cet appareil remplacera la version cloud.',
    useCloudConsequence: 'La version cloud remplacera la version de cet appareil.',
  };
}

function preparedInitial(): PreparedRealGoalReconciliation {
  return {
    accountUserId: 'user-1',
    preview: {
      localGoalCount: 1,
      cloudGoalCount: 1,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 1,
      changeOrigin: 'unknown',
    },
    localDigest: 'local-digest',
    cloudDigest: 'cloud-digest',
    cloudStamp: { revision: 2, actorId: 'cloud' },
    preparedAt: '2026-08-17T20:00:00.000Z',
    items: [reconciliationItem()],
  };
}

function preparedConcurrent(): PreparedRealGoalConcurrentReconciliation {
  return {
    accountUserId: 'user-1',
    preview: {
      localGoalCount: 1,
      cloudGoalCount: 1,
      localDeletionCount: 0,
      cloudDeletionCount: 0,
      differingEntityCount: 1,
      changeOrigin: 'both',
    },
    localDigest: 'local-both-digest',
    cloudDigest: 'cloud-both-digest',
    cloudStamp: { revision: 5, actorId: 'cloud-device' },
    baselineDigest: 'baseline-digest',
    preparedAt: '2026-08-18T13:00:00.000Z',
    items: [reconciliationItem()],
  };
}

function resultFor(
  preview: NonNullable<RealGoalSyncResult['changeOrigin']>,
): RealGoalSyncResult {
  return {
    localGoalCount: 1,
    cloudGoalCount: 1,
    localDeletionCount: 0,
    cloudDeletionCount: 0,
    differingEntityCount: 1,
    changeOrigin: preview,
    uploadedGoals: 1,
    downloadedGoals: 0,
    removedLocalGoals: 0,
    removedCloudGoals: 0,
    uploadedDeletionRecords: 0,
    downloadedDeletionRecords: 0,
    completedAt: '2026-08-18T13:01:00.000Z',
  };
}

describe('GoalSyncSettingsPanel', () => {
  it('conserve l’accès au compte lorsque Goals sync est indisponible', () => {
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

  it('autorise la synchronisation standard uniquement pour une provenance directionnelle', async () => {
    const user = userEvent.setup();
    const { client, syncRealGoals } = createClient('local');

    render(
      <MemoryRouter>
        <GoalSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    await waitFor(() => expect(client.initialize).toHaveBeenCalledTimes(1));
    expect(screen.getByText('local — cet appareil')).toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Synchroniser les objectifs',
    }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Synchroniser' }));

    await waitFor(() => expect(syncRealGoals).toHaveBeenCalledTimes(1));
  });

  it('garde le parcours unknown distinct et affiche le détail avant la première réconciliation', async () => {
    const user = userEvent.setup();
    const { client } = createClient('unknown');
    const prepareInitialReconciliation = vi.fn(async () => preparedInitial());
    const applyInitialReconciliation = vi.fn(async () => resultFor('unknown'));
    const prepareConcurrentReconciliation = vi.fn();

    render(
      <MemoryRouter>
        <GoalSyncSettingsPanel
          client={client}
          prepareInitialReconciliation={prepareInitialReconciliation}
          applyInitialReconciliation={applyInitialReconciliation}
          prepareConcurrentReconciliation={prepareConcurrentReconciliation}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('unknown — origine indéterminée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Synchroniser les objectifs' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Résoudre le conflit des objectifs' }))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réconcilier les objectifs' }));
    await waitFor(() => expect(prepareInitialReconciliation).toHaveBeenCalledWith('user-1'));
    expect(prepareConcurrentReconciliation).not.toHaveBeenCalled();

    expect(screen.getByText('Aperçu avant première réconciliation')).toBeInTheDocument();
    expect(screen.getByText('Courir 50 km')).toBeInTheDocument();
    expect(screen.getByText('Modifié')).toBeInTheDocument();
    expect(screen.getByText('Présent')).toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).not.toContain('tombstone');

    await user.click(screen.getByRole('button', { name: 'Conserver cet appareil' }));
    const dialog = screen.getByRole('alertdialog');
    await user.click(within(dialog).getByRole('button', { name: 'Conserver cet appareil' }));

    await waitFor(() => expect(applyInitialReconciliation).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({ accountUserId: 'user-1' }),
      'keep-local',
    ));
  });

  it('garde both fail-closed pour le sync standard et propose seulement une résolution manuelle détaillée', async () => {
    const user = userEvent.setup();
    const { client, syncRealGoals } = createClient('both');
    const prepareInitialReconciliation = vi.fn();
    const prepareConcurrentReconciliation = vi.fn(async () => preparedConcurrent());
    const applyConcurrentReconciliation = vi.fn(async () => resultFor('both'));

    render(
      <MemoryRouter>
        <GoalSyncSettingsPanel
          client={client}
          prepareInitialReconciliation={prepareInitialReconciliation}
          prepareConcurrentReconciliation={prepareConcurrentReconciliation}
          applyConcurrentReconciliation={applyConcurrentReconciliation}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('both — modifications des deux côtés')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Synchroniser les objectifs' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réconcilier les objectifs' }))
      .not.toBeInTheDocument();
    expect(screen.getByText(/synchronisation automatique et l’action globale restent bloquées/i))
      .toBeInTheDocument();

    await user.click(screen.getByRole('button', {
      name: 'Résoudre le conflit des objectifs',
    }));
    await waitFor(() => expect(prepareConcurrentReconciliation).toHaveBeenCalledWith('user-1'));
    expect(prepareInitialReconciliation).not.toHaveBeenCalled();
    expect(syncRealGoals).not.toHaveBeenCalled();

    expect(screen.getByText('Aperçu avant résolution du conflit')).toBeInTheDocument();
    expect(screen.getByText('Courir 50 km')).toBeInTheDocument();
    expect(document.body.textContent?.toLowerCase()).not.toContain('tombstone');

    await user.click(screen.getByRole('button', { name: 'Utiliser le cloud' }));
    const dialog = screen.getByRole('alertdialog');
    expect(within(dialog).getByText(/revalidera le compte, la référence et les deux états/i))
      .toBeInTheDocument();
    await user.click(within(dialog).getByRole('button', { name: 'Utiliser le cloud' }));

    await waitFor(() => expect(applyConcurrentReconciliation).toHaveBeenCalledWith(
      'user-1',
      expect.objectContaining({
        accountUserId: 'user-1',
        baselineDigest: 'baseline-digest',
      }),
      'use-cloud',
    ));
    expect(syncRealGoals).not.toHaveBeenCalled();
  });
});
