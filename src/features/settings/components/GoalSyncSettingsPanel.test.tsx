import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { GoalSyncSettingsPanel } from '@/features/settings/components/GoalSyncSettingsPanel';
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

function prepared(): PreparedRealGoalReconciliation {
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
    items: [
      {
        id: 'goal-legacy',
        title: 'Courir 50 km',
        localStatus: 'modified',
        cloudStatus: 'present',
        keepLocalConsequence: 'La version de cet appareil remplacera la version cloud.',
        useCloudConsequence: 'La version cloud remplacera la version de cet appareil.',
      },
    ],
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

  it('affiche les Goals réels concernés avant tout choix global pour unknown', async () => {
    const user = userEvent.setup();
    const { client } = createClient('unknown');
    const prepareInitialReconciliation = vi.fn(async () => prepared());
    const applyInitialReconciliation = vi.fn(async (): Promise<RealGoalSyncResult> => ({
      ...prepared().preview,
      uploadedGoals: 1,
      downloadedGoals: 0,
      removedLocalGoals: 0,
      removedCloudGoals: 0,
      uploadedDeletionRecords: 0,
      downloadedDeletionRecords: 0,
      completedAt: '2026-08-17T20:01:00.000Z',
    }));

    render(
      <MemoryRouter>
        <GoalSyncSettingsPanel
          client={client}
          prepareInitialReconciliation={prepareInitialReconciliation}
          applyInitialReconciliation={applyInitialReconciliation}
        />
      </MemoryRouter>,
    );

    expect(screen.getByText('unknown — origine indéterminée')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Synchroniser les objectifs' }))
      .not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Réconcilier les objectifs' }));
    await waitFor(() => expect(prepareInitialReconciliation).toHaveBeenCalledWith('user-1'));

    expect(screen.getByText('Aperçu avant réconciliation')).toBeInTheDocument();
    expect(screen.getByText('Courir 50 km')).toBeInTheDocument();
    expect(screen.getByText('Modifié')).toBeInTheDocument();
    expect(screen.getByText('Présent')).toBeInTheDocument();
    expect(screen.getByText(/version de cet appareil remplacera la version cloud/i)).toBeInTheDocument();
    expect(screen.getByText(/version cloud remplacera la version de cet appareil/i)).toBeInTheDocument();
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

  it('ne propose aucune résolution directionnelle ni première réconciliation pour both', () => {
    const { client } = createClient('both');

    render(
      <MemoryRouter>
        <GoalSyncSettingsPanel client={client} />
      </MemoryRouter>,
    );

    expect(screen.getByText('both — modifications des deux côtés')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Synchroniser les objectifs' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Réconcilier les objectifs' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Conserver cet appareil' }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Utiliser le cloud' }))
      .not.toBeInTheDocument();
  });
});
