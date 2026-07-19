import type Dexie from 'dexie';
import type { Table } from 'dexie';

import { sameEntity } from '@/infrastructure/sync-prototype/cloudSyncValue';

export function sameLocalCollection<T extends { id: string }>(
  current: readonly T[],
  expected: readonly T[],
): boolean {
  const byId = (values: readonly T[]) =>
    [...values].sort((left, right) => left.id.localeCompare(right.id));
  return sameEntity(byId(current), byId(expected));
}

export async function putLocalIfUnchanged<T, Key>(
  database: Dexie,
  table: Table<T, Key>,
  key: Key,
  expected: T | undefined,
  target: T,
): Promise<boolean> {
  return database.transaction('rw', table, async () => {
    const current = await table.get(key);
    if (!sameEntity(current, expected)) return false;
    await table.put(target);
    return true;
  });
}

export async function deleteLocalIfUnchanged<T, Key>(
  database: Dexie,
  table: Table<T, Key>,
  key: Key,
  expected: T | undefined,
): Promise<boolean> {
  return database.transaction('rw', table, async () => {
    const current = await table.get(key);
    if (!sameEntity(current, expected)) return false;
    await table.delete(key);
    return true;
  });
}
