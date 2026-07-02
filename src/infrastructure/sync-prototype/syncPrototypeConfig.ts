import { syncPublicDeploymentConfig } from '@/infrastructure/sync-prototype/syncPublicDeploymentConfig';

export interface SyncPrototypeEnvironment {
  readonly VITE_ENABLE_SYNC_PROTOTYPE?: string;
  readonly VITE_DEXIE_CLOUD_DATABASE_URL?: string;
  readonly VITE_ENABLE_REAL_WEIGHT_SYNC?: string;
  readonly VITE_ENABLE_REAL_ACTIVITY_SYNC?: string;
  readonly VITE_ENABLE_REAL_GOAL_SYNC?: string;
  readonly VITE_ENABLE_REAL_STRENGTH_SYNC?: string;
  readonly VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC?: string;
  readonly VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC?: string;
  readonly VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC?: string;
  readonly VITE_ENABLE_SYNC_DIAGNOSTICS?: string;
}

export interface DisabledSyncPrototypeConfig {
  enabled: false;
}

export interface EnabledSyncPrototypeConfig {
  enabled: true;
  databaseUrl: string;
  realWeightSyncEnabled: boolean;
  realActivitySyncEnabled: boolean;
  realGoalSyncEnabled: boolean;
  realStrengthSyncEnabled: boolean;
  realNutritionJournalSyncEnabled: boolean;
  realNutritionLibrarySyncEnabled: boolean;
  realNutritionTrackingSyncEnabled: boolean;
  diagnosticsEnabled: boolean;
}

export type SyncPrototypeConfig =
  | DisabledSyncPrototypeConfig
  | EnabledSyncPrototypeConfig;

export interface SafeSyncPrototypeConfigResult {
  readonly config: SyncPrototypeConfig;
  readonly errorMessage?: string;
}

function messageFromConfigurationError(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'La configuration Dexie Cloud est invalide.';
}

function readEnabledFlag(
  value: string | undefined,
  variableName = 'VITE_ENABLE_SYNC_PROTOTYPE',
): boolean {
  const normalized = value?.trim().toLowerCase();

  if (!normalized || normalized === 'false') return false;
  if (normalized === 'true') return true;

  throw new Error(
    `${variableName} doit valoir true ou false.`,
  );
}

function normalizeDexieCloudDatabaseUrl(value: string | undefined): string {
  const candidate = value?.trim();
  if (!candidate) {
    throw new Error(
      'VITE_DEXIE_CLOUD_DATABASE_URL est obligatoire lorsque le prototype est activé.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error(
      'VITE_DEXIE_CLOUD_DATABASE_URL doit être une URL valide.',
    );
  }

  const isHostedDexieCloud =
    parsed.protocol === 'https:' &&
    parsed.hostname.endsWith('.dexie.cloud') &&
    parsed.hostname !== 'dexie.cloud';
  const isRootUrl = parsed.pathname === '/' && !parsed.search && !parsed.hash;
  const hasNoEmbeddedCredentials = !parsed.username && !parsed.password;
  const hasDefaultPort = parsed.port === '';

  if (
    !isHostedDexieCloud ||
    !isRootUrl ||
    !hasNoEmbeddedCredentials ||
    !hasDefaultPort
  ) {
    throw new Error(
      'Le prototype exige une URL racine HTTPS de la forme https://<base>.dexie.cloud, sans identifiants ni paramètres.',
    );
  }

  return parsed.origin;
}

export function mergeSyncPrototypeProductionEnvironment(
  environment: SyncPrototypeEnvironment,
): SyncPrototypeEnvironment {
  return {
    ...environment,
    ...syncPublicDeploymentConfig,
  };
}

function readRuntimeSyncPrototypeEnvironment(): SyncPrototypeEnvironment {
  if (!import.meta.env.PROD) return import.meta.env;

  return mergeSyncPrototypeProductionEnvironment(import.meta.env);
}

export function readSyncPrototypeConfig(
  environment: SyncPrototypeEnvironment = readRuntimeSyncPrototypeEnvironment(),
): SyncPrototypeConfig {
  if (!readEnabledFlag(environment.VITE_ENABLE_SYNC_PROTOTYPE)) {
    return { enabled: false };
  }

  return {
    enabled: true,
    databaseUrl: normalizeDexieCloudDatabaseUrl(
      environment.VITE_DEXIE_CLOUD_DATABASE_URL,
    ),
    realWeightSyncEnabled: readEnabledFlag(
      environment.VITE_ENABLE_REAL_WEIGHT_SYNC,
      'VITE_ENABLE_REAL_WEIGHT_SYNC',
    ),
    realActivitySyncEnabled: readEnabledFlag(
      environment.VITE_ENABLE_REAL_ACTIVITY_SYNC,
      'VITE_ENABLE_REAL_ACTIVITY_SYNC',
    ),
    realGoalSyncEnabled: readEnabledFlag(
      environment.VITE_ENABLE_REAL_GOAL_SYNC,
      'VITE_ENABLE_REAL_GOAL_SYNC',
    ),
    realStrengthSyncEnabled: readEnabledFlag(
      environment.VITE_ENABLE_REAL_STRENGTH_SYNC,
      'VITE_ENABLE_REAL_STRENGTH_SYNC',
    ),
    realNutritionJournalSyncEnabled: readEnabledFlag(
      environment.VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC,
      'VITE_ENABLE_REAL_NUTRITION_JOURNAL_SYNC',
    ),
    realNutritionLibrarySyncEnabled: readEnabledFlag(
      environment.VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC,
      'VITE_ENABLE_REAL_NUTRITION_LIBRARY_SYNC',
    ),
    realNutritionTrackingSyncEnabled: readEnabledFlag(
      environment.VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC,
      'VITE_ENABLE_REAL_NUTRITION_TRACKING_SYNC',
    ),
    diagnosticsEnabled: readEnabledFlag(
      environment.VITE_ENABLE_SYNC_DIAGNOSTICS,
      'VITE_ENABLE_SYNC_DIAGNOSTICS',
    ),
  };
}

export function readSyncPrototypeConfigSafely(
  environment: SyncPrototypeEnvironment = readRuntimeSyncPrototypeEnvironment(),
): SafeSyncPrototypeConfigResult {
  try {
    return { config: readSyncPrototypeConfig(environment) };
  } catch (error) {
    return {
      config: { enabled: false },
      errorMessage: messageFromConfigurationError(error),
    };
  }
}
