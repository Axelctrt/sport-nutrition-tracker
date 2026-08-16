import { createDefaultDeviceSettings } from '@/domain/defaults/appSettings';
import { DEVICE_SETTINGS_ID } from '@/domain/defaults/identifiers';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  readDataSpaceRegistry,
  type DataSpaceStorage,
} from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { currentIsoDateTime } from '@/shared/utils/entities';

export type AccountContinuityInitializer = (
  database: AppDatabase,
  accountFingerprint: string,
) => Promise<void>;

export interface AccountContinuityInitializationResult {
  readonly initialized: boolean;
  readonly warningMessage?: string;
}

const CONTINUITY_INITIALIZATION_WARNING =
  'Les données du compte sont disponibles, mais la continuité automatique n’a pas pu être activée sur cet appareil. Elle peut être activée manuellement dans les paramètres du compte.';

function normalizeFingerprint(accountFingerprint: string): string {
  return accountFingerprint.trim().toLowerCase();
}

export function isFirstLogicalAccountAssociation(
  accountFingerprint: string,
  storage?: DataSpaceStorage,
): boolean {
  const normalized = normalizeFingerprint(accountFingerprint);
  return !readDataSpaceRegistry(storage).spaces.some(
    (space) =>
      space.kind === 'account' &&
      space.accountFingerprint === normalized,
  );
}

export async function initializeAutomaticAccountContinuity(
  database: AppDatabase,
  accountFingerprint: string,
): Promise<void> {
  const normalized = normalizeFingerprint(accountFingerprint);
  const existing = await database.deviceSettings.get(DEVICE_SETTINGS_ID);

  if (!existing) {
    const created = createDefaultDeviceSettings();
    await database.deviceSettings.put({
      ...created,
      automaticAccountSyncEnabled: true,
      automaticAccountSyncAccountFingerprint: normalized,
    });
    return;
  }

  await database.deviceSettings.update(DEVICE_SETTINGS_ID, {
    automaticAccountSyncEnabled: true,
    automaticAccountSyncAccountFingerprint: normalized,
    updatedAt: currentIsoDateTime(),
  });
}

export async function initializeAutomaticAccountContinuityBestEffort(
  database: AppDatabase,
  accountFingerprint: string,
  initializer: AccountContinuityInitializer = initializeAutomaticAccountContinuity,
): Promise<AccountContinuityInitializationResult> {
  try {
    await initializer(database, accountFingerprint);
    return { initialized: true };
  } catch {
    return {
      initialized: false,
      warningMessage: CONTINUITY_INITIALIZATION_WARNING,
    };
  }
}
