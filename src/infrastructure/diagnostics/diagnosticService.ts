import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { appDatabase } from '@/infrastructure/database/database';
import { CURRENT_BACKUP_SCHEMA_VERSION } from '@/infrastructure/backup/backupMigrations';
import { tableList } from '@/infrastructure/backup/backupService';
import { getPersistentStorageStatus } from '@/infrastructure/storage/persistentStorage';
import { readLastTechnicalError, type TechnicalErrorRecord } from '@/infrastructure/diagnostics/technicalErrorLog';

export interface TechnicalDiagnostic {
  format: 'sportpilot-diagnostic';
  generatedAt: string;
  applicationVersion: string;
  dexieSchemaVersion: number;
  backupSchemaVersion: number;
  environment: {
    userAgent: string;
    platform: string;
    displayMode: 'standalone' | 'browser';
    persistentStorage: 'unsupported' | 'persisted' | 'notPersisted';
  };
  serviceWorker: {
    supported: boolean;
    controlled: boolean;
    registrationCount: number;
  };
  recordCounts: Record<string, number>;
  lastTechnicalError?: TechnicalErrorRecord;
  capabilities: Record<string, boolean>;
}

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

async function readServiceWorkerState(): Promise<TechnicalDiagnostic['serviceWorker']> {
  if (!('serviceWorker' in navigator)) {
    return { supported: false, controlled: false, registrationCount: 0 };
  }
  try {
    const registrations = await navigator.serviceWorker.getRegistrations();
    return {
      supported: true,
      controlled: navigator.serviceWorker.controller !== null,
      registrationCount: registrations.length,
    };
  } catch {
    return {
      supported: true,
      controlled: navigator.serviceWorker.controller !== null,
      registrationCount: 0,
    };
  }
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as NavigatorWithStandalone).standalone);
}

export async function createTechnicalDiagnostic(
  database: AppDatabase = appDatabase,
  generatedAt: string = new Date().toISOString(),
): Promise<TechnicalDiagnostic> {
  const tables = tableList(database);
  const counts = await Promise.all(tables.map((table) => table.count()));
  const recordCounts = Object.fromEntries(
    tables.map((table, index) => [table.name, counts[index] ?? 0]),
  );
  const persistentStorage = await getPersistentStorageStatus();
  const serviceWorker = await readServiceWorkerState();
  const lastTechnicalError = readLastTechnicalError();

  return {
    format: 'sportpilot-diagnostic',
    generatedAt,
    applicationVersion: __APP_VERSION__,
    dexieSchemaVersion: database.verno,
    backupSchemaVersion: CURRENT_BACKUP_SCHEMA_VERSION,
    environment: {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      displayMode: isStandalone() ? 'standalone' : 'browser',
      persistentStorage,
    },
    serviceWorker,
    recordCounts,
    ...(lastTechnicalError === undefined ? {} : { lastTechnicalError }),
    capabilities: {
      indexedDb: 'indexedDB' in window,
      serviceWorker: 'serviceWorker' in navigator,
      camera: Boolean(navigator.mediaDevices?.getUserMedia),
      vibration: 'vibrate' in navigator,
      persistentStorage: Boolean(navigator.storage?.persisted),
      fileDownload: 'download' in document.createElement('a'),
      webShare: 'share' in navigator,
    },
  };
}

export function serializeTechnicalDiagnostic(diagnostic: TechnicalDiagnostic): string {
  return JSON.stringify(diagnostic, null, 2);
}

export function createDiagnosticFileName(generatedAt: string): string {
  const stamp = generatedAt.replaceAll(/[:.]/g, '-');
  return `sportpilot-diagnostic-${stamp}.json`;
}
