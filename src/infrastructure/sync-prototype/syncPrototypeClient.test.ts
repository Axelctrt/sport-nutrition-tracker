import type {
  DXCUserInteraction,
  SyncState,
  UserLogin,
} from 'dexie-cloud-addon';
import {
  createSyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';

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
  const open = vi.fn(async () => undefined);
  const login = vi.fn(async () => undefined);
  const logout = vi.fn(async () => undefined);
  const sync = vi.fn(async () => undefined);

  return {
    database: {
      open,
      cloud: {
        currentUser,
        syncState,
        userInteraction,
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
  };
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
    const client = createSyncPrototypeClient(database);

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
    const client = createSyncPrototypeClient(database);
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
    });

    unsubscribe();
  });

  it('transmet l’email à Dexie Cloud et expose uniquement l’interaction filtrée', async () => {
    const { database, open, login, userInteraction } =
      createFakeDatabase();
    const client = createSyncPrototypeClient(database);
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
    const client = createSyncPrototypeClient(database);
    const interaction = createOtpInteraction();

    userInteraction.next(interaction);
    client.submitInteraction({ otp: '123456' });
    client.cancelInteraction();

    expect(interaction.onSubmit).toHaveBeenCalledWith({ otp: '123456' });
    expect(interaction.onCancel).toHaveBeenCalledTimes(1);
  });

  it('ouvre une seule fois la base avant les commandes cloud', async () => {
    const { database, open, logout, sync } = createFakeDatabase();
    const client = createSyncPrototypeClient(database);

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
    const client = createSyncPrototypeClient(database);

    await client.login('test@example.com');

    expect(login).not.toHaveBeenCalled();
  });
});
