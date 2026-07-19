import Dexie from 'dexie';

import type { DataSpaceDescriptor } from '@/domain/data-spaces/dataSpace';
import {
  activateGuestDataSpace,
  detachAccountDataSpaceFromCurrentDevice,
  removeAccountDataSpace,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { appDatabase, activeDataSpace } from '@/infrastructure/database/database';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import type { RemoteAccountDataDeletionResult } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { purgeRuntimeSocialActivitySnapshotOutbox } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotOutbox';

export interface AccountDeviceManagementOptions {
  readonly space?: DataSpaceDescriptor;
  readonly storage?: DataSpaceStorage;
  readonly database?: AppDatabase;
  readonly now?: Date | string;
  readonly purgeSocialOutbox?: (ownerUserId: string) => Promise<number>;
}

function requireAccountSpace(
  space: DataSpaceDescriptor,
): asserts space is DataSpaceDescriptor & {
  readonly kind: 'account';
  readonly accountFingerprint: string;
} {
  if (space.kind !== 'account' || !space.accountFingerprint) {
    throw new Error('Aucun espace de compte actif n’est disponible sur cet appareil.');
  }
}

export async function disconnectAccount(
  client: SyncPrototypeClient,
): Promise<void> {
  await client.logout();
}

export async function detachCurrentDeviceFromAccount(
  client: SyncPrototypeClient,
  options: AccountDeviceManagementOptions = {},
): Promise<DataSpaceDescriptor> {
  const space = options.space ?? activeDataSpace;
  requireAccountSpace(space);

  await client.logout();
  return detachAccountDataSpaceFromCurrentDevice(
    space.accountFingerprint,
    options.storage,
    options.now,
  );
}

export async function deleteLocalAccountData(
  client: SyncPrototypeClient,
  options: AccountDeviceManagementOptions = {},
): Promise<{ readonly databaseName: string }> {
  const space = options.space ?? activeDataSpace;
  requireAccountSpace(space);

  const database = options.database ?? appDatabase;
  const ownerUserId = client.getCloudCredentials?.()?.userId;

  await client.logout();
  if (ownerUserId) {
    await (
      options.purgeSocialOutbox
      ?? purgeRuntimeSocialActivitySnapshotOutbox
    )(ownerUserId);
  }
  activateGuestDataSpace(options.storage, options.now);
  database.close();
  await Dexie.delete(space.databaseName);
  removeAccountDataSpace(
    space.accountFingerprint,
    options.storage,
    options.now,
  );

  return { databaseName: space.databaseName };
}

export async function deleteCloudAndLocalAccountData(
  client: SyncPrototypeClient,
  options: AccountDeviceManagementOptions = {},
): Promise<
  RemoteAccountDataDeletionResult & { readonly databaseName: string }
> {
  const space = options.space ?? activeDataSpace;
  requireAccountSpace(space);
  if (!client.deleteRemoteAccountData) {
    throw new Error('La suppression distante n’est pas disponible dans cette version.');
  }

  const remote = await client.deleteRemoteAccountData();
  const local = await deleteLocalAccountData(client, {
    ...options,
    space,
  });
  return { ...remote, ...local };
}
