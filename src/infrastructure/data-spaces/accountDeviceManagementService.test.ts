import Dexie from 'dexie';

import type {
  SyncPrototypeClient,
  SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  deleteCloudAndLocalAccountData,
  deleteLocalAccountData,
  detachCurrentDeviceFromAccount,
  disconnectAccount,
} from '@/infrastructure/data-spaces/accountDeviceManagementService';
import {
  activateAccountDataSpace,
  getActiveDataSpace,
  readDataSpaceRegistry,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';

class MemoryStorage implements DataSpaceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function createClient(): SyncPrototypeClient {
  return {
    getSnapshot: vi.fn() as SyncPrototypeClient['getSnapshot'],
    subscribe: vi.fn(() => () => undefined),
    initialize: vi.fn(async () => undefined),
    login: vi.fn(async () => undefined),
    submitInteraction: vi.fn(),
    cancelInteraction: vi.fn(),
    getCloudCredentials: vi.fn(() => undefined),
    logout: vi.fn(async () => undefined),
    syncNow: vi.fn(async () => undefined),
    analyzeRealWeights: vi.fn() as SyncPrototypeClient['analyzeRealWeights'],
    syncRealWeights: vi.fn() as SyncPrototypeClient['syncRealWeights'],
    saveWeight: vi.fn() as SyncPrototypeClient['saveWeight'],
    deleteWeight: vi.fn(async () => undefined),
  };
}

const FINGERPRINT = 'acct-a1b2c3d4';
const NOW = '2026-07-01T10:00:00.000Z';

describe('accountDeviceManagementService', () => {
  it('distingue la déconnexion simple des opérations locales', async () => {
    const client = createClient();

    await disconnectAccount(client);

    expect(client.logout).toHaveBeenCalledTimes(1);
  });

  it('désassocie l’appareil tout en conservant l’espace du compte', async () => {
    const storage = new MemoryStorage();
    const space = activateAccountDataSpace(FINGERPRINT, storage, NOW);
    const client = createClient();

    await detachCurrentDeviceFromAccount(client, {
      space,
      storage,
      now: '2026-07-01T11:00:00.000Z',
    });

    expect(client.logout).toHaveBeenCalledTimes(1);
    expect(getActiveDataSpace(storage).kind).toBe('guest');
    expect(
      readDataSpaceRegistry(storage).spaces.find(
        (candidate) => candidate.id === space.id,
      ),
    ).toMatchObject({
      databaseName: space.databaseName,
      linkedToCurrentDevice: false,
    });
  });

  it('supprime uniquement la base locale et retire son descripteur', async () => {
    const storage = new MemoryStorage();
    const space = activateAccountDataSpace(FINGERPRINT, storage, NOW);
    const database = new AppDatabase(space.databaseName);
    await database.open();
    await database.weights.put({
      id: 'weight-1',
      date: '2026-07-01',
      weightKg: 61,
      createdAt: NOW,
      updatedAt: NOW,
    });
    const client = createClient();
    vi.mocked(client.getSnapshot).mockReturnValue({
      account: {
        isLoggedIn: true,
        isLoading: false,
        userId: 'account-user',
      },
    } as SyncPrototypeSnapshot);
    const purgeSocialOutbox = vi.fn(async () => 2);

    await deleteLocalAccountData(client, {
      space,
      storage,
      database,
      now: NOW,
      purgeSocialOutbox,
    });

    expect(await Dexie.exists(space.databaseName)).toBe(false);
    expect(client.logout).toHaveBeenCalledTimes(1);
    expect(purgeSocialOutbox).toHaveBeenCalledWith('account-user');
    expect(getActiveDataSpace(storage).kind).toBe('guest');
    expect(
      readDataSpaceRegistry(storage).spaces.some(
        (candidate) => candidate.id === space.id,
      ),
    ).toBe(false);
  });

  it('conserve la base et le registre lorsque la déconnexion échoue', async () => {
    const storage = new MemoryStorage();
    const space = activateAccountDataSpace(FINGERPRINT, storage, NOW);
    const database = new AppDatabase(space.databaseName);
    await database.open();
    const client = createClient();
    vi.mocked(client.logout).mockRejectedValueOnce(new Error('logout failed'));

    await expect(
      deleteLocalAccountData(client, { space, storage, database, now: NOW }),
    ).rejects.toThrow('logout failed');

    expect(await Dexie.exists(space.databaseName)).toBe(true);
    expect(getActiveDataSpace(storage).id).toBe(space.id);
    database.close();
    await Dexie.delete(space.databaseName);
  });

  it('ne supprime la base locale qu’après confirmation de la purge distante', async () => {
    const storage = new MemoryStorage();
    const space = activateAccountDataSpace(FINGERPRINT, storage, NOW);
    const database = new AppDatabase(space.databaseName);
    await database.open();
    const client = createClient();
    client.deleteRemoteAccountData = vi.fn(async () => ({
      deletedSocialRecords: 2,
      deletedCloudRecords: 4,
      deletedByTable: { realWeights: 4 },
    }));

    const result = await deleteCloudAndLocalAccountData(client, {
      space,
      storage,
      database,
      now: NOW,
      purgeSocialOutbox: vi.fn(async () => 0),
    });

    expect(client.deleteRemoteAccountData).toHaveBeenCalledOnce();
    expect(client.logout).toHaveBeenCalledOnce();
    expect(await Dexie.exists(space.databaseName)).toBe(false);
    expect(result).toMatchObject({
      databaseName: space.databaseName,
      deletedSocialRecords: 2,
      deletedCloudRecords: 4,
    });
  });
});
