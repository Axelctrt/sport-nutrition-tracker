import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { DataSpaceDescriptor } from '@/domain/data-spaces/dataSpace';
import { DataSpaceAccountGate } from '@/app/data-spaces/DataSpaceAccountGate';
import {
  createDefaultDataSpaceRegistry,
  detachAccountDataSpaceFromCurrentDevice,
  registerAccountDataSpace,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

class MemoryStorage implements DataSpaceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createSnapshot(
  account: Partial<SyncPrototypeSnapshot['account']> = {},
): SyncPrototypeSnapshot {
  return {
    account: {
      isLoggedIn: false,
      isLoading: false,
      ...account,
    },
    sync: {
      status: 'disconnected',
      phase: 'initial',
    },
    weights: {
      weights: [],
      deletedCount: 0,
      isLoading: false,
    },
    diagnostics: {
      databaseName: 'test-cloud',
      databaseVersion: 1,
      visibleWeightCount: 0,
      deletedWeightCount: 0,
    },
  };
}

function createClient(initialSnapshot: SyncPrototypeSnapshot) {
  let snapshot = initialSnapshot;
  const listeners = new Set<() => void>();

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
    logout: vi.fn(async () => {
      snapshot = createSnapshot();
      for (const listener of listeners) listener();
    }),
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
      completedAt: '2026-07-01T08:00:00.000Z',
    })),
    saveWeight: vi.fn(async () => {
      throw new Error('not used');
    }),
    deleteWeight: vi.fn(async () => undefined),
  };

  return client;
}

const guestSpace = createDefaultDataSpaceRegistry(
  '2026-07-01T08:00:00.000Z',
).spaces[0]!;

const ACCOUNT_A_ID = 'compte-a@example.com';
const ACCOUNT_A_FINGERPRINT = createSyncPrototypeAccountFingerprint(
  ACCOUNT_A_ID,
)!.toLowerCase();
const NEW_ACCOUNT_ID = 'nouveau@example.com';
const NEW_ACCOUNT_FINGERPRINT = createSyncPrototypeAccountFingerprint(
  NEW_ACCOUNT_ID,
)!.toLowerCase();

const accountSpace: DataSpaceDescriptor = {
  id: `account:${ACCOUNT_A_FINGERPRINT}`,
  kind: 'account',
  databaseName: `sportpilot-local-database--${ACCOUNT_A_FINGERPRINT}`,
  label: 'Espace de compte',
  accountFingerprint: ACCOUNT_A_FINGERPRINT,
  createdAt: '2026-07-01T08:00:00.000Z',
  lastActivatedAt: '2026-07-01T08:00:00.000Z',
};

describe('DataSpaceAccountGate', () => {
  it('ouvre normalement l’espace invité lorsqu’aucun compte n’est connecté', async () => {
    render(
      <DataSpaceAccountGate
        client={createClient(createSnapshot())}
        currentSpace={guestSpace}
        reload={vi.fn()}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(await screen.findByText('Données privées')).toBeInTheDocument();
  });

  it('masque les données et demande un choix pour un nouveau compte', async () => {
    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: NEW_ACCOUNT_ID,
          }),
        )}
        currentSpace={guestSpace}
        reload={vi.fn()}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Choisir l’espace de ce compte',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Données privées')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Rattacher mes données' }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', {
        name: 'Commencer avec un espace vide',
      }),
    ).toBeInTheDocument();
  });

  it('crée explicitement un espace vide puis recharge l’application', async () => {
    const createEmptySpace = vi.fn(async () => ({
      space: accountSpace,
      copiedRecords: 0,
      copiedTables: 0,
    }));
    const reload = vi.fn();

    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: NEW_ACCOUNT_ID,
          }),
        )}
        currentSpace={guestSpace}
        reload={reload}
        createEmptySpace={createEmptySpace}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    await userEvent.click(
      await screen.findByRole('button', {
        name: 'Commencer avec un espace vide',
      }),
    );

    await waitFor(() => expect(createEmptySpace).toHaveBeenCalledTimes(1));
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('ouvre un espace déjà associé sans proposer une nouvelle copie', async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace(NEW_ACCOUNT_FINGERPRINT, storage);
    const activateExistingSpace = vi.fn(() => accountSpace);
    const reload = vi.fn();

    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: NEW_ACCOUNT_ID,
          }),
        )}
        currentSpace={guestSpace}
        storage={storage}
        reload={reload}
        activateExistingSpace={activateExistingSpace}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByText('Espace déjà connu sur cet appareil'),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Rattacher mes données' }),
    ).not.toBeInTheDocument();

    await userEvent.click(
      screen.getByRole('button', {
        name: 'Ouvrir l’espace de ce compte',
      }),
    );

    expect(activateExistingSpace).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });


  it('propose une réassociation explicite après désassociation locale', async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace(NEW_ACCOUNT_FINGERPRINT, storage);
    detachAccountDataSpaceFromCurrentDevice(
      NEW_ACCOUNT_FINGERPRINT,
      storage,
    );
    const activateExistingSpace = vi.fn(() => accountSpace);

    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: NEW_ACCOUNT_ID,
          }),
        )}
        currentSpace={guestSpace}
        storage={storage}
        reload={vi.fn()}
        activateExistingSpace={activateExistingSpace}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByText('Espace local conservé après désassociation'),
    ).toBeInTheDocument();
    await userEvent.click(
      screen.getByRole('button', {
        name: 'Réassocier et ouvrir cet espace',
      }),
    );
    expect(activateExistingSpace).toHaveBeenCalledTimes(1);
  });


  it('ouvre uniquement l’espace correspondant au compte connecté', async () => {
    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: ACCOUNT_A_ID,
          }),
        )}
        currentSpace={accountSpace}
        reload={vi.fn()}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByText('Données du compte A'),
    ).toBeInTheDocument();
  });

  it('masque immédiatement les données du compte A lorsque le compte B est connecté', async () => {
    render(
      <DataSpaceAccountGate
        client={createClient(
          createSnapshot({
            isLoggedIn: true,
            userId: NEW_ACCOUNT_ID,
          }),
        )}
        currentSpace={accountSpace}
        reload={vi.fn()}
      >
        <p>Données du compte A</p>
      </DataSpaceAccountGate>,
    );

    expect(
      await screen.findByRole('heading', {
        name: 'Choisir l’espace de ce compte',
      }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Données du compte A')).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Rattacher mes données' }),
    ).not.toBeInTheDocument();
  });

  it('revient à l’espace invité après une déconnexion', async () => {
    const storage = new MemoryStorage();
    registerAccountDataSpace('acct-A1B2C3D4', storage);
    const reload = vi.fn();

    render(
      <DataSpaceAccountGate
        client={createClient(createSnapshot())}
        currentSpace={accountSpace}
        storage={storage}
        reload={reload}
      >
        <p>Données privées</p>
      </DataSpaceAccountGate>,
    );

    await waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(screen.queryByText('Données privées')).not.toBeInTheDocument();
  });
});
