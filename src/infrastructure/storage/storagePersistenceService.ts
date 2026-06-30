export type StoragePersistenceState =
  | 'unsupported'
  | 'best-effort'
  | 'persistent';

export interface StoragePersistenceStatus {
  state: StoragePersistenceState;
  canRequest: boolean;
}

export interface StorageManagerLike {
  persisted?: () => Promise<boolean>;
  persist?: () => Promise<boolean>;
}

export class StoragePersistenceError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'StoragePersistenceError';
  }
}

function browserStorageManager(): StorageManagerLike | undefined {
  if (typeof navigator === 'undefined') return undefined;
  return navigator.storage;
}

export async function getStoragePersistenceStatus(
  manager: StorageManagerLike | undefined = browserStorageManager(),
): Promise<StoragePersistenceStatus> {
  if (!manager?.persisted) {
    return {
      state: 'unsupported',
      canRequest: false,
    };
  }

  try {
    const persistent = await manager.persisted();

    return {
      state: persistent ? 'persistent' : 'best-effort',
      canRequest: !persistent && typeof manager.persist === 'function',
    };
  } catch (error) {
    throw new StoragePersistenceError(
      'L’état de protection du stockage n’a pas pu être vérifié.',
      { cause: error },
    );
  }
}

export async function requestPersistentStorage(
  manager: StorageManagerLike | undefined = browserStorageManager(),
): Promise<StoragePersistenceStatus> {
  if (!manager?.persisted || !manager.persist) {
    return {
      state: 'unsupported',
      canRequest: false,
    };
  }

  try {
    if (await manager.persisted()) {
      return {
        state: 'persistent',
        canRequest: false,
      };
    }

    const granted = await manager.persist();

    return {
      state: granted ? 'persistent' : 'best-effort',
      canRequest: !granted,
    };
  } catch (error) {
    throw new StoragePersistenceError(
      'La protection renforcée du stockage n’a pas pu être demandée.',
      { cause: error },
    );
  }
}
