import Dexie from 'dexie';

import type { DataSpaceDescriptor } from '@/domain/data-spaces/dataSpace';
import {
  activateAccountDataSpace,
  activateDataSpace,
  readDataSpaceRegistry,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import { accountDatabaseNameForFingerprint } from '@/infrastructure/database/databaseNames';

const TECHNICAL_TABLES = new Set([
  'migrationJournal',
  'databaseDiagnostics',
]);

const COPY_BATCH_SIZE = 500;

export interface AccountDataSpacePreparationResult {
  readonly space: DataSpaceDescriptor;
  readonly copiedRecords: number;
  readonly copiedTables: number;
}

export interface AccountDataSpaceServiceOptions {
  readonly storage?: DataSpaceStorage;
  readonly sourceDatabase?: AppDatabase;
  readonly now?: Date | string;
}

function normalizeFingerprint(accountFingerprint: string): string {
  return accountFingerprint.trim().toLowerCase();
}

async function countUserRecords(database: AppDatabase): Promise<number> {
  let total = 0;

  for (const table of database.tables) {
    if (TECHNICAL_TABLES.has(table.name)) continue;
    total += await table.count();
  }

  return total;
}

async function openTargetDatabase(
  accountFingerprint: string,
): Promise<{ database: AppDatabase; existed: boolean }> {
  const databaseName = accountDatabaseNameForFingerprint(accountFingerprint);
  const existed = await Dexie.exists(databaseName);
  const database = new AppDatabase(databaseName);
  await database.open();
  return { database, existed };
}

async function assertTargetEmpty(database: AppDatabase): Promise<void> {
  if ((await countUserRecords(database)) > 0) {
    throw new Error(
      'Cet espace de compte contient déjà des données locales. Ouvre cet espace au lieu de le remplacer.',
    );
  }
}

async function removeUnregisteredTarget(
  database: AppDatabase,
  existed: boolean,
): Promise<void> {
  database.close();
  if (!existed) {
    await Dexie.delete(database.name);
  }
}

export function findAccountDataSpace(
  accountFingerprint: string,
  storage?: DataSpaceStorage,
): DataSpaceDescriptor | undefined {
  const normalized = normalizeFingerprint(accountFingerprint);
  return readDataSpaceRegistry(storage).spaces.find(
    (space) =>
      space.kind === 'account' &&
      space.accountFingerprint === normalized,
  );
}

export function activateExistingAccountDataSpace(
  accountFingerprint: string,
  options: Pick<AccountDataSpaceServiceOptions, 'storage' | 'now'> = {},
): DataSpaceDescriptor {
  const existing = findAccountDataSpace(
    accountFingerprint,
    options.storage,
  );

  if (!existing) {
    throw new Error('Aucun espace local n’est encore associé à ce compte.');
  }

  return activateDataSpace(existing.id, options.storage, options.now);
}

export async function createEmptyAccountDataSpace(
  accountFingerprint: string,
  options: Pick<AccountDataSpaceServiceOptions, 'storage' | 'now'> = {},
): Promise<AccountDataSpacePreparationResult> {
  const normalized = normalizeFingerprint(accountFingerprint);
  const existing = findAccountDataSpace(normalized, options.storage);

  if (existing) {
    return {
      space: activateDataSpace(existing.id, options.storage, options.now),
      copiedRecords: 0,
      copiedTables: 0,
    };
  }

  const { database, existed } = await openTargetDatabase(normalized);

  try {
    await assertTargetEmpty(database);
    database.close();
    return {
      space: activateAccountDataSpace(
        normalized,
        options.storage,
        options.now,
      ),
      copiedRecords: 0,
      copiedTables: 0,
    };
  } catch (error) {
    await removeUnregisteredTarget(database, existed);
    throw error;
  }
}

export async function attachCurrentDataToAccountSpace(
  accountFingerprint: string,
  options: AccountDataSpaceServiceOptions = {},
): Promise<AccountDataSpacePreparationResult> {
  const normalized = normalizeFingerprint(accountFingerprint);
  const existing = findAccountDataSpace(normalized, options.storage);

  if (existing) {
    throw new Error(
      'Un espace local existe déjà pour ce compte. Ouvre-le sans recopier les données invitées.',
    );
  }

  const sourceDatabase = options.sourceDatabase ?? appDatabase;
  await sourceDatabase.open();

  const snapshots: Array<{
    readonly tableName: string;
    readonly rows: readonly unknown[];
  }> = [];
  let copiedRecords = 0;

  for (const table of sourceDatabase.tables) {
    if (TECHNICAL_TABLES.has(table.name)) continue;
    const rows = await table.toArray();
    snapshots.push({ tableName: table.name, rows });
    copiedRecords += rows.length;
  }

  const { database: targetDatabase, existed } =
    await openTargetDatabase(normalized);

  let copyStarted = false;

  try {
    await assertTargetEmpty(targetDatabase);
    copyStarted = true;

    for (const snapshot of snapshots) {
      const targetTable = targetDatabase.table(snapshot.tableName);
      for (
        let offset = 0;
        offset < snapshot.rows.length;
        offset += COPY_BATCH_SIZE
      ) {
        await targetTable.bulkPut(
          snapshot.rows.slice(offset, offset + COPY_BATCH_SIZE),
        );
      }
    }

    targetDatabase.close();

    return {
      space: activateAccountDataSpace(
        normalized,
        options.storage,
        options.now,
      ),
      copiedRecords,
      copiedTables: snapshots.filter((snapshot) => snapshot.rows.length > 0)
        .length,
    };
  } catch (error) {
    targetDatabase.close();
    if (!existed || copyStarted) {
      await Dexie.delete(targetDatabase.name);
    }
    throw error;
  }
}
