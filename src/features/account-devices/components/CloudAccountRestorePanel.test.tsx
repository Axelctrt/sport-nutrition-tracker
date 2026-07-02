import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { CloudAccountRestorePanel } from '@/features/account-devices/components/CloudAccountRestorePanel';
import type {
  CloudAccountRestoreResult,
  PreparedCloudAccountRestore,
} from '@/infrastructure/data-spaces/cloudAccountRestoreService';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';

const ACCOUNT_FINGERPRINT = 'acct-a1b2c3d4';

function prepared(
  overrides: Partial<PreparedCloudAccountRestore['preview']> = {},
): PreparedCloudAccountRestore {
  return {
    accountFingerprint: ACCOUNT_FINGERPRINT,
    targetDatabaseName: `sportpilot-local-database--${ACCOUNT_FINGERPRINT}`,
    sourceFingerprint: 'source-1',
    targetFingerprint: 'missing',
    targetDatabaseExisted: false,
    analyzedAt: '2026-07-02T08:00:00.000Z',
    preview: {
      hasCloudData: true,
      cloudRecordCount: 3,
      cloudDeletionMarkerCount: 1,
      localMeaningfulRecordCount: 0,
      localState: 'missing',
      canRestore: true,
      categories: [
        {
          key: 'weights',
          label: 'Pesées',
          description: 'Historique des pesées synchronisées.',
          recordCount: 3,
        },
      ],
      ...overrides,
    },
  };
}

function snapshot(): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: true,
      isLoading: false,
      userId: 'compte@example.com',
    },
    sync: { status: 'connected', phase: 'in-sync' },
    weights: { weights: [], deletedCount: 0, isLoading: false },
    diagnostics: {
      databaseName: 'test-cloud',
      databaseVersion: 8,
      visibleWeightCount: 0,
      deletedWeightCount: 0,
    },
  };
}

function createClient(value: PreparedCloudAccountRestore): SyncPrototypeClient {
  return {
    getSnapshot: snapshot,
    subscribe: vi.fn(() => () => undefined),
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    logout: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    prepareCloudRestore: vi.fn(async () => value),
    applyCloudRestore: vi.fn(async (): Promise<CloudAccountRestoreResult> => ({
      restoredRecords: value.preview.cloudRecordCount,
      restoredDeletionMarkers: value.preview.cloudDeletionMarkerCount,
      sourcePreserved: true,
      space: {
        id: `account:${ACCOUNT_FINGERPRINT}`,
        kind: 'account',
        databaseName: value.targetDatabaseName,
        label: 'Espace de compte',
        accountFingerprint: ACCOUNT_FINGERPRINT,
        linkedToCurrentDevice: true,
        createdAt: '2026-07-02T08:00:00.000Z',
        lastActivatedAt: '2026-07-02T08:00:00.000Z',
      },
      completedAt: '2026-07-02T08:05:00.000Z',
    })),
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
      completedAt: '2026-07-02T08:00:00.000Z',
    })),
    saveWeight: vi.fn(async () => {
      throw new Error('not used');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };
}

describe('CloudAccountRestorePanel', () => {
  it('analyse automatiquement puis restaure après confirmation explicite', async () => {
    const value = prepared();
    const client = createClient(value);
    const reload = vi.fn();

    render(
      <CloudAccountRestorePanel
        accountFingerprint={ACCOUNT_FINGERPRINT}
        client={client}
        autoAnalyze
        reload={reload}
      />,
    );

    expect(
      await screen.findByText('Des données ont été trouvées pour ce compte'),
    ).toBeInTheDocument();
    expect(client.prepareCloudRestore).toHaveBeenCalledWith(ACCOUNT_FINGERPRINT);

    await userEvent.click(
      screen.getByRole('button', { name: 'Restaurer depuis le cloud' }),
    );
    expect(
      screen.getByRole('heading', { name: 'Restaurer les données cloud ?' }),
    ).toBeInTheDocument();
    const dialog = screen.getByRole('alertdialog');
    await userEvent.click(
      within(dialog).getByRole('button', { name: 'Restaurer depuis le cloud' }),
    );

    await waitFor(() => expect(client.applyCloudRestore).toHaveBeenCalledWith(value));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('indique clairement lorsqu’aucune donnée cloud n’existe', async () => {
    const client = createClient(
      prepared({
        hasCloudData: false,
        cloudRecordCount: 0,
        cloudDeletionMarkerCount: 0,
        canRestore: false,
      }),
    );

    render(
      <CloudAccountRestorePanel
        accountFingerprint={ACCOUNT_FINGERPRINT}
        client={client}
        autoAnalyze
        reload={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('Aucune donnée cloud trouvée'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Restaurer depuis le cloud' }),
    ).not.toBeInTheDocument();
  });

  it('bloque la restauration initiale lorsque l’espace local est déjà utilisé', async () => {
    const client = createClient(
      prepared({
        localState: 'non-empty',
        localMeaningfulRecordCount: 2,
        canRestore: false,
      }),
    );

    render(
      <CloudAccountRestorePanel
        accountFingerprint={ACCOUNT_FINGERPRINT}
        client={client}
        autoAnalyze
        reload={vi.fn()}
      />,
    );

    expect(
      await screen.findByText('Espace local déjà utilisé'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Restaurer depuis le cloud' }),
    ).not.toBeInTheDocument();
  });
});
