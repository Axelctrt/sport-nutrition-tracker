export type PersistentStorageStatus =
  | 'unsupported'
  | 'persisted'
  | 'notPersisted';

export async function getPersistentStorageStatus(): Promise<PersistentStorageStatus> {
  if (!navigator.storage?.persisted) {
    return 'unsupported';
  }

  return (await navigator.storage.persisted()) ? 'persisted' : 'notPersisted';
}

export async function requestPersistentStorage(): Promise<PersistentStorageStatus> {
  if (!navigator.storage?.persist) {
    return 'unsupported';
  }

  const granted = await navigator.storage.persist();
  return granted ? 'persisted' : 'notPersisted';
}
