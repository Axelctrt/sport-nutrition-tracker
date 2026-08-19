import type {
  DXCUserInteraction,
  SyncState,
  UserLogin,
} from 'dexie-cloud-addon';
import type { SyncPrototypeDatabase } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { createSyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';

class FakeObservable<T> {
  private readonly listeners = new Set<(value: T) => void>();

  constructor(public value: T) {}

  subscribe(listener: (value: T) => void) {
    this.listeners.add(listener);
    return {
      unsubscribe: () => this.listeners.delete(listener),
    };
  }
}

describe('SyncPrototypeClient — fraîcheur du transport cloud', () => {
  it('force un pull serveur avant de considérer le replica cloud à jour', async () => {
    const currentUser = new FakeObservable<UserLogin>({
      claims: {},
      lastLogin: new Date('2026-08-19T16:00:00.000Z'),
      isLoggedIn: true,
      isLoading: false,
      email: 'goals-runtime@example.com',
      userId: 'goals-runtime@example.com',
      accessToken: 'test-access-token',
    });
    const syncState = new FakeObservable<SyncState>({
      status: 'connected',
      phase: 'in-sync',
    });
    const userInteraction = new FakeObservable<DXCUserInteraction | undefined>(
      undefined,
    );
    const syncComplete = new FakeObservable<void>(undefined);
    const sync = vi.fn(async () => undefined);

    const database = {
      on: vi.fn(),
      open: vi.fn(async () => undefined),
      close: vi.fn(),
      weights: {
        toArray: vi.fn(async () => []),
      },
      deletionRecords: {
        toArray: vi.fn(async () => []),
      },
      cloud: {
        currentUserId: 'goals-runtime@example.com',
        currentUser,
        syncState,
        userInteraction,
        events: { syncComplete },
        sync,
      },
    } as unknown as SyncPrototypeDatabase;

    const client = createSyncPrototypeClient(database);

    await client.syncNow();

    expect(sync).toHaveBeenCalledTimes(1);
    expect(sync).toHaveBeenCalledWith({ purpose: 'pull' });
  });
});
