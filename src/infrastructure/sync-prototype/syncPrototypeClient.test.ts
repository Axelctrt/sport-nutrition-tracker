import type {
  DXCUserInteraction,
  SyncState,
  UserLogin,
} from 'dexie-cloud-addon';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  createSyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';

class FakeObservable<T> {
  private listeners = new Set<(value: T) => void>();
  value: T;

  constructor(value: T) {
    this.value = value;
  }

  subscribe(listener: (value: T) => void) {
    this.listeners.add(listener);
    return {
      unsubscribe: () => {
        this.listeners.delete(listener);
      },
    };
  }

  next(value: T) {
    this.value = value;
    for (const listener of this.listeners) listener(value);
  }
}

function createFakeDatabase() {
  const currentUser = new FakeObservable<UserLogin>({
    claims: {},
    lastLogin: new Date('2026-06-29T18:00:00.000Z'),
    isLoggedIn: false,
    isLoading: false,
    accessToken: 'secret-token',
  });
  const syncState = new FakeObservable<SyncState>({
    status: 'not-started',
    phase: 'initial',
  });
  const userInteraction = new FakeObservable<
    DXCUserInteraction | undefined
  >(undefined);
  const syncComplete = new FakeObservable<void>(undefined);
  const weightRows = new Map<string, any>();
  const deletionRows = new Map<string, any>();
  const realWeightRows = new Map<string, any>();
  const realDeletionRows = new Map<string, any>();
  const weights = {
    toArray: vi.fn(async () => [...weightRows.values()]),
    get: vi.fn(async (id: string) => weightRows.get(id)),
    add: vi.fn(async (value: any) => {
      weightRows.set(value.id, { ...value, owner: currentUser.value.userId });
      return value.id;
    }),
    put: vi.fn(async (value: any) => {
      weightRows.set(value.id, { ...value, owner: currentUser.value.userId });
      return value.id;
    }),
    update: vi.fn(async (id: string, changes: Record<string, unknown>) => {
      const current = weightRows.get(id);
      if (!current) return 0;
      weightRows.set(id, { ...current, ...changes });
      return 1;
    }),
    delete: vi.fn(async (id: string) => {
      weightRows.delete(id);
    }),
  };
  const deletionRecords = {
    toArray: vi.fn(async () => [...deletionRows.values()]),
    get: vi.fn(async (id: string) => deletionRows.get(id)),
    add: vi.fn(async (value: any) => {
      deletionRows.set(value.id, {
        ...value,
        owner: currentUser.value.userId,
      });
      return value.id;
    }),
    put: vi.fn(async (value: any) => {
      deletionRows.set(value.id, {
        ...value,
        owner: currentUser.value.userId,
      });
      return value.id;
    }),
    update: vi.fn(async (id: string, changes: Record<string, unknown>) => {
      const current = deletionRows.get(id);
      if (!current) return 0;
      deletionRows.set(id, { ...current, ...changes });
      return 1;
    }),
    delete: vi.fn(async (id: string) => {
      deletionRows.delete(id);
    }),
  };
  const createCloudTable = (rows: Map<string, any>) => ({
    toArray: vi.fn(async () => [...rows.values()]),
    get: vi.fn(async (id: string) => rows.get(id)),
    put: vi.fn(async (value: any) => {
      rows.set(value.id, { ...value, owner: currentUser.value.userId });
      return value.id;
    }),
    delete: vi.fn(async (id: string) => {
      rows.delete(id);
    }),
  });
  const realWeights = createCloudTable(realWeightRows);
  const realWeightDeletionRecords = createCloudTable(realDeletionRows);
  const open = vi.fn(async () => undefined);
  const login = vi.fn(async () => undefined);
  const logout = vi.fn(async () => undefined);
  const sync = vi.fn(async () => undefined);

  return {
    database: {
      open,
      weights,
      deletionRecords,
      realWeights,
      realWeightDeletionRecords,
      transaction: vi.fn(
        async <T>(
          _mode: string,
          _firstTable: unknown,
          _secondTable: unknown,
          scope: () => Promise<T>,
        ): Promise<T> => scope(),
      ),
      cloud: {
        currentUserId: currentUser.value.userId ?? 'unauthorized',
        currentUser,
        syncState,
        userInteraction,
        events: {
          syncComplete,
        },
        login,
        logout,
        sync,
      },
    },
    currentUser,
    syncState,
    userInteraction,
    open,
    login,
    logout,
    sync,
    syncComplete,
    weights,
    deletionRecords,
    weightRows,
    deletionRows,
    realWeights,
    realWeightDeletionRecords,
    realWeightRows,
    realDeletionRows,
  };
}

function createClient(
  database: unknown,
  options: Parameters<typeof createSyncPrototypeClient>[1] = {},
) {
  return createSyncPrototypeClient(
    database as SyncPrototypeDatabase,
    options,
  );
}

function createOtpInteraction() {
  return {
    type: 'otp',
    title: 'Enter OTP',
    alerts: [
      {
        type: 'info',
        messageCode: 'OTP_SENT',
        message: 'OTP sent',
        messageParams: { email: 'test@example.com' },
      },
    ],
    fields: {
      otp: {
        type: 'text',
        label: 'OTP',
      },
    },
    submitLabel: 'OK',
    cancelLabel: 'Cancel',
    onSubmit: vi.fn(),
    onCancel: vi.fn(),
  } satisfies DXCUserInteraction;
}

describe('client sécurisé du prototype Dexie Cloud', () => {
  it('n’expose jamais les jetons ou clés du compte', () => {
    const { database } = createFakeDatabase();
    const client = createClient(database);

    const snapshot = client.getSnapshot();
    expect(snapshot.account).toEqual({
      isLoggedIn: false,
      isLoading: false,
    });
    expect(snapshot.account).not.toHaveProperty('accessToken');
    expect(snapshot.account).not.toHaveProperty('refreshToken');
    expect(snapshot.account).not.toHaveProperty(
      'nonExportablePrivateKey',
    );
  });

  it('actualise un instantané stable lors des événements du cloud', () => {
    const { database, currentUser, syncState } = createFakeDatabase();
    const client = createClient(database);
    const snapshots: SyncPrototypeSnapshot[] = [];
    const unsubscribe = client.subscribe(() => {
      snapshots.push(client.getSnapshot());
    });

    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-29T18:05:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
      name: 'Compte test',
      accessToken: 'secret-token',
      license: {
        type: 'eval',
        status: 'ok',
        evalDaysLeft: 30,
      },
    });
    syncState.next({
      status: 'connected',
      phase: 'in-sync',
      progress: 100,
      license: 'ok',
    });

    expect(snapshots).toHaveLength(2);
    expect(client.getSnapshot()).toEqual({
      account: {
        isLoggedIn: true,
        isLoading: false,
        email: 'test@example.com',
        userId: 'test@example.com',
        displayName: 'Compte test',
        license: {
          type: 'eval',
          status: 'ok',
          evalDaysLeft: 30,
        },
      },
      sync: {
        status: 'connected',
        phase: 'in-sync',
        progress: 100,
        license: 'ok',
      },
      weights: {
        weights: [],
        deletedCount: 0,
        isLoading: true,
      },
      diagnostics: {
        databaseName: 'sportpilot-sync-prototype',
        databaseVersion: 3,
        visibleWeightCount: 0,
        deletedWeightCount: 0,
        accountFingerprint:
          createSyncPrototypeAccountFingerprint('test@example.com'),
      },
    });

    unsubscribe();
  });

  it('transmet l’email à Dexie Cloud et expose uniquement l’interaction filtrée', async () => {
    const { database, open, login, userInteraction } =
      createFakeDatabase();
    const client = createClient(database);
    const interaction = createOtpInteraction();

    userInteraction.next(interaction);
    await client.login('  test@example.com  ');

    expect(open).toHaveBeenCalledTimes(1);
    expect(login).toHaveBeenCalledWith({
      grant_type: 'otp',
      email: 'test@example.com',
    });
    expect(client.getSnapshot().interaction).toEqual({
      type: 'otp',
      title: 'Enter OTP',
      alerts: [
        {
          type: 'info',
          messageCode: 'OTP_SENT',
          message: 'OTP sent',
          messageParams: { email: 'test@example.com' },
        },
      ],
      submitLabel: 'OK',
      cancelLabel: 'Cancel',
    });
    expect(client.getSnapshot().interaction).not.toHaveProperty(
      'onSubmit',
    );
  });

  it('relaie la validation et l’annulation de l’interaction active', () => {
    const { database, userInteraction } = createFakeDatabase();
    const client = createClient(database);
    const interaction = createOtpInteraction();

    userInteraction.next(interaction);
    client.submitInteraction({ otp: '123456' });
    client.cancelInteraction();

    expect(interaction.onSubmit).toHaveBeenCalledWith({ otp: '123456' });
    expect(interaction.onCancel).toHaveBeenCalledTimes(1);
  });

  it('ouvre une seule fois la base avant les commandes cloud', async () => {
    const { database, open, logout, sync } = createFakeDatabase();
    const client = createClient(database);

    await client.initialize();
    await client.initialize();
    await client.syncNow();
    await client.logout();

    expect(open).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledTimes(1);
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it('ne relance pas le flux OTP lorsque la session restaurée est déjà connectée', async () => {
    const { database, currentUser, login } = createFakeDatabase();
    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-29T18:05:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
    });
    const client = createClient(database);

    await client.login('test@example.com');

    expect(login).not.toHaveBeenCalled();
  });


  it('crée, met à jour et supprime une pesée fictive avec son marqueur', async () => {
    const { database, currentUser, weightRows, deletionRows } =
      createFakeDatabase();
    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-30T08:00:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
    });
    database.cloud.currentUserId = 'test@example.com';
    const client = createClient(database);

    await client.initialize();
    await client.saveWeight({
      date: '2026-06-30',
      weightKg: 75.4,
      note: 'Ordinateur',
    });

    expect(client.getSnapshot().weights.weights).toEqual([
      expect.objectContaining({
        id: 'weight:2026-06-30',
        date: '2026-06-30',
        weightKg: 75.4,
        note: 'Ordinateur',
      }),
    ]);

    await client.saveWeight({
      date: '2026-06-30',
      weightKg: 75.1,
    });
    expect(weightRows.get('weight:2026-06-30')).toEqual(
      expect.objectContaining({
        weightKg: 75.1,
        note: '',
      }),
    );

    await client.deleteWeight('weight:2026-06-30');

    expect(weightRows.has('weight:2026-06-30')).toBe(false);
    expect(
      deletionRows.get('deletion:weight:weight:2026-06-30'),
    ).toEqual(
      expect.objectContaining({
        entityType: 'weight',
        entityId: 'weight:2026-06-30',
        status: 'deleted',
      }),
    );
    expect(client.getSnapshot().weights).toEqual({
      weights: [],
      deletedCount: 1,
      isLoading: false,
    });
  });

  it('réactive explicitement une date supprimée sans résurrection silencieuse', async () => {
    const { database, currentUser, deletionRows } = createFakeDatabase();
    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-30T08:00:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
    });
    database.cloud.currentUserId = 'test@example.com';
    deletionRows.set('deletion:weight:weight:2026-06-30', {
      id: 'deletion:weight:weight:2026-06-30',
      entityType: 'weight',
      entityId: 'weight:2026-06-30',
      status: 'deleted',
      deletedAt: '2026-06-30T07:00:00.000Z',
      createdAt: '2026-06-30T07:00:00.000Z',
      updatedAt: '2026-06-30T07:00:00.000Z',
      owner: 'test@example.com',
    });
    const client = createClient(database);

    await client.initialize();
    await client.saveWeight({
      date: '2026-06-30',
      weightKg: 74.8,
    });

    expect(
      deletionRows.get('deletion:weight:weight:2026-06-30'),
    ).toEqual(
      expect.objectContaining({
        status: 'restored',
        restoredAt: expect.any(String),
      }),
    );
    expect(client.getSnapshot().weights.weights).toHaveLength(1);
  });

  it('envoie uniquement les propriétés réellement modifiées pour limiter les conflits', async () => {
    const { database, currentUser, weights } = createFakeDatabase();
    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-30T08:00:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
    });
    database.cloud.currentUserId = 'test@example.com';
    const client = createClient(database);

    await client.initialize();
    await client.saveWeight({
      date: '2026-06-30',
      weightKg: 75,
      note: 'Note initiale',
    });

    weights.update.mockClear();
    await client.saveWeight({
      date: '2026-06-30',
      weightKg: 74.8,
      note: 'Note initiale',
    });

    expect(weights.update).toHaveBeenCalledWith(
      'weight:2026-06-30',
      expect.objectContaining({
        weightKg: 74.8,
        updatedAt: expect.any(String),
      }),
    );
    expect(weights.update.mock.calls[0]?.[1]).not.toHaveProperty('note');

    weights.update.mockClear();
    await client.saveWeight({
      date: '2026-06-30',
      weightKg: 74.8,
      note: 'Note téléphone',
    });

    expect(weights.update).toHaveBeenCalledWith(
      'weight:2026-06-30',
      expect.objectContaining({
        note: 'Note téléphone',
        updatedAt: expect.any(String),
      }),
    );
    expect(weights.update.mock.calls[0]?.[1]).not.toHaveProperty(
      'weightKg',
    );
  });

  it('isole les lignes d’un autre compte et masque une résurrection obsolète', async () => {
    const {
      database,
      currentUser,
      weightRows,
      deletionRows,
    } = createFakeDatabase();
    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-30T08:00:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'account-a@example.com',
      userId: 'account-a@example.com',
    });
    database.cloud.currentUserId = 'account-a@example.com';
    weightRows.set('weight:2026-06-28', {
      id: 'weight:2026-06-28',
      date: '2026-06-28',
      weightKg: 75,
      createdAt: '2026-06-28T08:00:00.000Z',
      updatedAt: '2026-06-28T08:00:00.000Z',
      owner: 'account-a@example.com',
    });
    weightRows.set('weight:2026-06-29', {
      id: 'weight:2026-06-29',
      date: '2026-06-29',
      weightKg: 74.9,
      createdAt: '2026-06-29T08:00:00.000Z',
      updatedAt: '2026-06-29T08:00:00.000Z',
      owner: 'account-b@example.com',
    });
    weightRows.set('weight:2026-06-30', {
      id: 'weight:2026-06-30',
      date: '2026-06-30',
      weightKg: 74.8,
      createdAt: '2026-06-30T08:00:00.000Z',
      updatedAt: '2026-06-30T08:00:00.000Z',
      owner: 'account-a@example.com',
    });
    deletionRows.set('deletion:weight:weight:2026-06-30', {
      id: 'deletion:weight:weight:2026-06-30',
      entityType: 'weight',
      entityId: 'weight:2026-06-30',
      status: 'deleted',
      deletedAt: '2026-06-30T08:05:00.000Z',
      createdAt: '2026-06-30T08:05:00.000Z',
      updatedAt: '2026-06-30T08:05:00.000Z',
      owner: 'account-a@example.com',
    });
    const client = createClient(database);

    await client.initialize();

    expect(client.getSnapshot().weights).toEqual({
      weights: [
        expect.objectContaining({ id: 'weight:2026-06-28' }),
      ],
      deletedCount: 1,
      isLoading: false,
    });
    expect(client.getSnapshot().diagnostics).toEqual(
      expect.objectContaining({
        accountFingerprint:
          createSyncPrototypeAccountFingerprint(
            'account-a@example.com',
          ),
        visibleWeightCount: 1,
        deletedWeightCount: 1,
        latestWeightUpdatedAt: '2026-06-28T08:00:00.000Z',
        lastRefreshAt: expect.any(String),
      }),
    );
  });

  it('horodate la fin de synchronisation sans exposer de donnée sensible', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-30T09:30:00.000Z'));
    const { database, currentUser, syncComplete } = createFakeDatabase();
    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-30T08:00:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
    });
    database.cloud.currentUserId = 'test@example.com';
    const client = createClient(database);

    await client.initialize();
    syncComplete.next();

    expect(client.getSnapshot().diagnostics.lastSyncCompletedAt).toBe(
      '2026-06-30T09:30:00.000Z',
    );
    expect(JSON.stringify(client.getSnapshot().diagnostics)).not.toContain(
      'test@example.com',
    );
    vi.useRealTimers();
  });

  it('refuse toute synchronisation réelle lorsque le flag C4 est désactivé', async () => {
    const { database, currentUser } = createFakeDatabase();
    currentUser.next({
      claims: {},
      lastLogin: new Date('2026-06-30T08:00:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'test@example.com',
      userId: 'test@example.com',
    });
    database.cloud.currentUserId = 'test@example.com';
    const client = createClient(database);

    await expect(client.analyzeRealWeights()).rejects.toThrow(
      'désactivée par configuration',
    );
  });

  it('analyse puis synchronise les vraies pesées avec des identifiants cloud privés', async () => {
    const localDatabase = new AppDatabase(
      `sportpilot-c4-client-${crypto.randomUUID()}`,
    );
    await localDatabase.open();

    try {
      await localDatabase.weights.add({
        id: 'weight:2026-07-05',
        date: '2026-07-05',
        weightKg: 68.2,
        createdAt: '2026-07-05T08:00:00.000Z',
        updatedAt: '2026-07-05T08:00:00.000Z',
      });
      const { database, currentUser, realWeightRows } = createFakeDatabase();
      currentUser.next({
        claims: {},
        lastLogin: new Date('2026-07-05T09:00:00.000Z'),
        isLoggedIn: true,
        isLoading: false,
        email: 'test@example.com',
        userId: 'test@example.com',
      });
      database.cloud.currentUserId = 'test@example.com';
      const client = createClient(database, {
        realWeightSyncEnabled: true,
        localDatabase,
      });

      await expect(client.analyzeRealWeights()).resolves.toMatchObject({
        localWeightCount: 1,
        cloudWeightCount: 0,
        differingEntityCount: 1,
      });
      await expect(client.syncRealWeights()).resolves.toMatchObject({
        uploadedWeights: 1,
      });
      expect(realWeightRows.get('#weight:2026-07-05')).toMatchObject({
        weightKg: 68.2,
        owner: 'test@example.com',
      });
      expect(client.getSnapshot().realWeights).toMatchObject({
        enabled: true,
        status: 'ready',
        preview: { differingEntityCount: 0 },
      });
    } finally {
      localDatabase.close();
      await localDatabase.delete();
    }
  });

});
