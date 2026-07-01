import Dexie from 'dexie';

import {
  DATA_SPACE_REGISTRY_STORAGE_KEY,
  getActiveDataSpace,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import {
  attachCurrentDataToAccountSpace,
  createEmptyAccountDataSpace,
} from '@/infrastructure/data-spaces/accountDataSpaceService';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { accountDatabaseNameForFingerprint } from '@/infrastructure/database/databaseNames';

class MemoryStorage implements DataSpaceStorage {
  private readonly values = new Map<string, string>();

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

const FINGERPRINT_WITH_DATA = 'acct-10101010';
const EMPTY_FINGERPRINT = 'acct-20202020';
const OCCUPIED_FINGERPRINT = 'acct-30303030';

async function deleteDatabase(name: string): Promise<void> {
  if (await Dexie.exists(name)) await Dexie.delete(name);
}

describe('accountDataSpaceService', () => {
  const databasesToDelete = new Set<string>();

  afterEach(async () => {
    for (const databaseName of databasesToDelete) {
      await deleteDatabase(databaseName);
    }
    databasesToDelete.clear();
  });

  it('copie les données invitées sans modifier la base source', async () => {
    const sourceName = 'sportpilot-test-guest-a2-copy';
    const targetName = accountDatabaseNameForFingerprint(
      FINGERPRINT_WITH_DATA,
    );
    databasesToDelete.add(sourceName);
    databasesToDelete.add(targetName);
    await deleteDatabase(sourceName);
    await deleteDatabase(targetName);

    const source = new AppDatabase(sourceName);
    await source.open();
    await source.weights.put({
      id: 'weight-2026-07-01',
      date: '2026-07-01',
      weightKg: 61.2,
      note: 'Mesure invitée',
      createdAt: '2026-07-01T08:00:00.000Z',
      updatedAt: '2026-07-01T08:00:00.000Z',
    });

    const storage = new MemoryStorage();
    const result = await attachCurrentDataToAccountSpace(
      FINGERPRINT_WITH_DATA,
      {
        storage,
        sourceDatabase: source,
        now: '2026-07-01T09:00:00.000Z',
      },
    );

    expect(result).toMatchObject({
      copiedRecords: 1,
      copiedTables: 1,
      space: {
        id: `account:${FINGERPRINT_WITH_DATA}`,
        databaseName: targetName,
      },
    });
    expect(await source.weights.count()).toBe(1);

    const target = new AppDatabase(targetName);
    await target.open();
    expect(await target.weights.toArray()).toEqual([
      expect.objectContaining({
        id: 'weight-2026-07-01',
        weightKg: 61.2,
      }),
    ]);
    target.close();

    expect(getActiveDataSpace(storage)).toMatchObject({
      id: `account:${FINGERPRINT_WITH_DATA}`,
      accountFingerprint: FINGERPRINT_WITH_DATA,
    });
    expect(storage.getItem(DATA_SPACE_REGISTRY_STORAGE_KEY)).not.toContain('@');
    source.close();
  });

  it('crée un espace vide sans copier de donnée', async () => {
    const targetName = accountDatabaseNameForFingerprint(EMPTY_FINGERPRINT);
    databasesToDelete.add(targetName);
    await deleteDatabase(targetName);
    const storage = new MemoryStorage();

    const result = await createEmptyAccountDataSpace(EMPTY_FINGERPRINT, {
      storage,
      now: '2026-07-01T09:00:00.000Z',
    });

    expect(result).toMatchObject({
      copiedRecords: 0,
      copiedTables: 0,
      space: { databaseName: targetName },
    });

    const target = new AppDatabase(targetName);
    await target.open();
    const userRecordCount = await Promise.all(
      target.tables
        .filter(
          (table) =>
            table.name !== 'migrationJournal' &&
            table.name !== 'databaseDiagnostics',
        )
        .map((table) => table.count()),
    );
    expect(userRecordCount.reduce((sum, count) => sum + count, 0)).toBe(0);
    target.close();
  });

  it('refuse de remplacer une base de compte déjà occupée', async () => {
    const sourceName = 'sportpilot-test-guest-a2-protected';
    const targetName = accountDatabaseNameForFingerprint(
      OCCUPIED_FINGERPRINT,
    );
    databasesToDelete.add(sourceName);
    databasesToDelete.add(targetName);
    await deleteDatabase(sourceName);
    await deleteDatabase(targetName);

    const source = new AppDatabase(sourceName);
    const target = new AppDatabase(targetName);
    await source.open();
    await target.open();
    await target.weights.put({
      id: 'existing-weight',
      date: '2026-06-30',
      weightKg: 62,
      createdAt: '2026-06-30T08:00:00.000Z',
      updatedAt: '2026-06-30T08:00:00.000Z',
    });
    target.close();

    await expect(
      attachCurrentDataToAccountSpace(OCCUPIED_FINGERPRINT, {
        storage: new MemoryStorage(),
        sourceDatabase: source,
      }),
    ).rejects.toThrow('contient déjà des données locales');

    const reopened = new AppDatabase(targetName);
    await reopened.open();
    expect(await reopened.weights.get('existing-weight')).toBeDefined();
    reopened.close();
    source.close();
  });
});
