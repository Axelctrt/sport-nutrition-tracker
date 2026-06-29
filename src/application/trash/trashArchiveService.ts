import type { TrashItem } from '@/domain/models/trash';
import { TRASH_RETENTION_DAYS } from '@/domain/models/trash';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { persistDeletionRecordsForTrashItem } from '@/infrastructure/repositories/dexie/trashService';

const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1_000;

export const TRASH_ARCHIVE_FORMAT = 'sportpilot-trash-archive';
export const TRASH_ARCHIVE_SCHEMA_VERSION = 1;
export const MAX_TRASH_ARCHIVE_FILE_SIZE_BYTES = 10 * 1024 * 1024;

export type TrashArchiveReason =
  | 'manual'
  | 'before-delete'
  | 'before-empty';

export interface TrashArchiveEnvelope {
  format: typeof TRASH_ARCHIVE_FORMAT;
  schemaVersion: typeof TRASH_ARCHIVE_SCHEMA_VERSION;
  exportedAt: string;
  reason: TrashArchiveReason;
  items: TrashItem[];
}

export interface PreparedTrashArchive {
  envelope: TrashArchiveEnvelope;
  content: string;
  fileName: string;
  itemCount: number;
}

export type TrashArchiveDownloader = (
  content: string,
  fileName: string,
  mimeType: string,
) => void;

export class TrashArchiveError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'TrashArchiveError';
  }
}

const allowedEntityTypes = new Set([
  'activity',
  'weight',
  'foodEntry',
  'meal',
  'favoriteMeal',
  'recipe',
  'strengthSet',
  'workoutSessionExercise',
]);

const reasonLabels: Record<TrashArchiveReason, string> = {
  manual: 'export',
  'before-delete': 'avant-suppression',
  'before-empty': 'avant-vidage',
};

function normalizeTimestamp(value: string): string {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value.replace(/[^a-zA-Z0-9-]/g, '-');
  }

  return date.toISOString().replace(/[:.]/g, '-');
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isTrashItemLike(value: unknown): value is TrashItem {
  if (!isObject(value)) return false;

  return (
    typeof value.id === 'string' &&
    typeof value.entityId === 'string' &&
    typeof value.entityType === 'string' &&
    allowedEntityTypes.has(value.entityType) &&
    typeof value.label === 'string' &&
    typeof value.deletedAt === 'string' &&
    typeof value.purgeAt === 'string' &&
    isObject(value.payload)
  );
}

function downloadArchive(
  content: string,
  fileName: string,
  mimeType: string,
): void {
  const blob = new Blob([content], {
    type: `${mimeType};charset=utf-8`,
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = 'noopener';
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export function createTrashArchiveFileName(
  exportedAt: string,
  reason: TrashArchiveReason,
): string {
  return `sportpilot-corbeille-${reasonLabels[reason]}-${normalizeTimestamp(
    exportedAt,
  )}.json`;
}

export function prepareTrashArchive(
  items: readonly TrashItem[],
  reason: TrashArchiveReason,
  now: Date = new Date(),
): PreparedTrashArchive {
  if (items.length === 0) {
    throw new TrashArchiveError(
      'La corbeille ne contient aucun élément à archiver.',
    );
  }

  const envelope: TrashArchiveEnvelope = {
    format: TRASH_ARCHIVE_FORMAT,
    schemaVersion: TRASH_ARCHIVE_SCHEMA_VERSION,
    exportedAt: now.toISOString(),
    reason,
    items: [...items],
  };

  return {
    envelope,
    content: JSON.stringify(envelope, null, 2),
    fileName: createTrashArchiveFileName(
      envelope.exportedAt,
      reason,
    ),
    itemCount: items.length,
  };
}

export function downloadTrashArchive(
  items: readonly TrashItem[],
  reason: TrashArchiveReason,
  now: Date = new Date(),
  download: TrashArchiveDownloader = downloadArchive,
): PreparedTrashArchive {
  try {
    const prepared = prepareTrashArchive(items, reason, now);

    download(
      prepared.content,
      prepared.fileName,
      'application/json',
    );

    return prepared;
  } catch (error) {
    if (error instanceof TrashArchiveError) throw error;

    throw new TrashArchiveError(
      'L’archive de sécurité de la corbeille n’a pas pu être créée. La suppression définitive a été annulée.',
      { cause: error },
    );
  }
}

export function parseTrashArchiveText(
  text: string,
): TrashArchiveEnvelope {
  let parsed: unknown;

  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new TrashArchiveError(
      'Le fichier sélectionné ne contient pas un JSON valide.',
      { cause: error },
    );
  }

  if (
    !isObject(parsed) ||
    parsed.format !== TRASH_ARCHIVE_FORMAT ||
    parsed.schemaVersion !== TRASH_ARCHIVE_SCHEMA_VERSION ||
    typeof parsed.exportedAt !== 'string' ||
    !Array.isArray(parsed.items) ||
    !parsed.items.every(isTrashItemLike)
  ) {
    throw new TrashArchiveError(
      'Le fichier n’est pas une archive de corbeille SportPilot compatible.',
    );
  }

  return parsed as unknown as TrashArchiveEnvelope;
}

export async function importTrashArchive(
  database: AppDatabase,
  text: string,
  now: Date = new Date(),
): Promise<number> {
  const envelope = parseTrashArchiveText(text);
  const renewedPurgeAt = new Date(
    now.getTime() +
      TRASH_RETENTION_DAYS * MILLISECONDS_PER_DAY,
  ).toISOString();

  const renewedItems = envelope.items.map((item) => ({
    ...item,
    purgeAt: renewedPurgeAt,
  }));

  await database.transaction(
    'rw',
    [database.trashItems, database.deletionRecords],
    async () => {
      await database.trashItems.bulkPut(renewedItems);

      for (const item of renewedItems) {
        await persistDeletionRecordsForTrashItem(
          database,
          item,
          'deleted',
          item.deletedAt,
        );
      }
    },
  );

  return renewedItems.length;
}
