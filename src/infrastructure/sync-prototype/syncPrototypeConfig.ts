export interface SyncPrototypeEnvironment {
  readonly VITE_ENABLE_SYNC_PROTOTYPE?: string;
  readonly VITE_DEXIE_CLOUD_DATABASE_URL?: string;
  readonly VITE_ENABLE_REAL_WEIGHT_SYNC?: string;
}

export interface DisabledSyncPrototypeConfig {
  enabled: false;
}

export interface EnabledSyncPrototypeConfig {
  enabled: true;
  databaseUrl: string;
  realWeightSyncEnabled: boolean;
}

export type SyncPrototypeConfig =
  | DisabledSyncPrototypeConfig
  | EnabledSyncPrototypeConfig;

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

export function readSyncPrototypeConfig(
  environment: SyncPrototypeEnvironment = import.meta.env,
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
  };
}
