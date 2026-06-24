import type { BackupEnvelope } from '@/domain/models/backup';
import { validateBackupEnvelope } from '@/infrastructure/backup/backupSchemas';

export const CURRENT_BACKUP_SCHEMA_VERSION = 1;

export class BackupMigrationError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'BackupMigrationError';
  }
}

interface BackupHeader {
  format?: unknown;
  schemaVersion?: unknown;
}

function readHeader(input: unknown): BackupHeader {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    throw new BackupMigrationError('Le fichier ne contient pas un objet de sauvegarde valide.');
  }
  return input as BackupHeader;
}

export function migrateBackupEnvelope(input: unknown): BackupEnvelope {
  const header = readHeader(input);

  if (header.format !== 'sportpilot-backup') {
    throw new BackupMigrationError('Ce fichier n’est pas une sauvegarde SportPilot reconnue.');
  }

  if (!Number.isInteger(header.schemaVersion)) {
    throw new BackupMigrationError('La version de schéma de la sauvegarde est absente ou invalide.');
  }

  const version = Number(header.schemaVersion);
  if (version > CURRENT_BACKUP_SCHEMA_VERSION) {
    throw new BackupMigrationError(
      `Cette sauvegarde utilise la version ${version}, plus récente que la version ${CURRENT_BACKUP_SCHEMA_VERSION} prise en charge. Mets d’abord l’application à jour.`,
    );
  }

  if (version < 1) {
    throw new BackupMigrationError(`La version de sauvegarde ${version} n’est pas prise en charge.`);
  }

  // La version 1 est le format initial. Les futures migrations seront chaînées ici.
  return validateBackupEnvelope(input);
}
