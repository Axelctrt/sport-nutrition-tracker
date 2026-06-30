import {
  getStoragePersistenceStatus,
  requestPersistentStorage,
  StoragePersistenceError,
  type StorageManagerLike,
} from '@/infrastructure/storage/storagePersistenceService';

describe('storagePersistenceService', () => {
  it('indique que l’API est indisponible', async () => {
    await expect(
      getStoragePersistenceStatus({}),
    ).resolves.toEqual({
      state: 'unsupported',
      canRequest: false,
    });
  });

  it('détecte un stockage déjà persistant', async () => {
    const manager = {
      persisted: vi.fn().mockResolvedValue(true),
      persist: vi.fn(),
    } satisfies StorageManagerLike;

    await expect(
      getStoragePersistenceStatus(manager),
    ).resolves.toEqual({
      state: 'persistent',
      canRequest: false,
    });

    expect(manager.persist).not.toHaveBeenCalled();
  });

  it('demande la persistance et confirme son attribution', async () => {
    const manager = {
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(true),
    } satisfies StorageManagerLike;

    await expect(
      requestPersistentStorage(manager),
    ).resolves.toEqual({
      state: 'persistent',
      canRequest: false,
    });

    expect(manager.persist).toHaveBeenCalledTimes(1);
  });

  it('conserve le mode best effort si le navigateur refuse', async () => {
    const manager = {
      persisted: vi.fn().mockResolvedValue(false),
      persist: vi.fn().mockResolvedValue(false),
    } satisfies StorageManagerLike;

    await expect(
      requestPersistentStorage(manager),
    ).resolves.toEqual({
      state: 'best-effort',
      canRequest: true,
    });
  });

  it('transforme les erreurs techniques en erreur métier', async () => {
    const manager = {
      persisted: vi.fn().mockRejectedValue(new Error('failure')),
    } satisfies StorageManagerLike;

    await expect(
      getStoragePersistenceStatus(manager),
    ).rejects.toBeInstanceOf(StoragePersistenceError);
  });
});
