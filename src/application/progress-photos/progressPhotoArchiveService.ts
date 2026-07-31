import type {
  ProcessedProgressPhotoImage,
  ProgressPhoto,
  ProgressPhotoAsset,
  ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import { PROGRESS_PHOTO_VIEWS } from '@/domain/models/progressPhoto';
import type { ProgressPhotoRepository } from '@/infrastructure/repositories/contracts/ProgressPhotoRepository';

export const PROGRESS_PHOTO_ARCHIVE_FORMAT = 'sportpilot-progress-photos';
export const PROGRESS_PHOTO_ARCHIVE_VERSION = 1;
export const MAX_PROGRESS_PHOTO_ARCHIVE_BYTES = 100 * 1024 * 1024;

interface ArchivedAsset {
  mimeType: string;
  width: number;
  height: number;
  byteSize: number;
  base64: string;
}

interface ArchivedProgressPhoto {
  date: string;
  view: ProgressPhotoView;
  weightKg?: number;
  note?: string;
  originalFileName?: string;
  original: ArchivedAsset;
  thumbnail: ArchivedAsset;
}

interface ProgressPhotoArchiveEnvelope {
  format: typeof PROGRESS_PHOTO_ARCHIVE_FORMAT;
  schemaVersion: typeof PROGRESS_PHOTO_ARCHIVE_VERSION;
  exportedAt: string;
  photos: ArchivedProgressPhoto[];
}

export interface ProgressPhotoArchiveImportResult {
  imported: number;
  skipped: number;
}

export class ProgressPhotoArchiveError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = 'ProgressPhotoArchiveError';
  }
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 32_768;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array<ArrayBuffer> {
  try {
    const binary = atob(value);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let index = 0; index < binary.length; index += 1) {
      bytes[index] = binary.charCodeAt(index);
    }
    return bytes;
  } catch (error) {
    throw new ProgressPhotoArchiveError(
      'Une image de la sauvegarde est illisible.',
      { cause: error },
    );
  }
}

async function archiveAsset(asset: ProgressPhotoAsset): Promise<ArchivedAsset> {
  const bytes = new Uint8Array(await asset.blob.arrayBuffer());
  return {
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    byteSize: asset.byteSize,
    base64: bytesToBase64(bytes),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readNumber(record: Record<string, unknown>, key: string): number {
  const value = record[key];
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new ProgressPhotoArchiveError('La sauvegarde contient des dimensions ou tailles invalides.');
  }
  return value;
}

function readAsset(value: unknown): ArchivedAsset {
  if (!isRecord(value)) {
    throw new ProgressPhotoArchiveError('La sauvegarde ne contient pas toutes les images attendues.');
  }
  if (typeof value.mimeType !== 'string' || typeof value.base64 !== 'string') {
    throw new ProgressPhotoArchiveError('Le format d’une image sauvegardée est invalide.');
  }
  return {
    mimeType: value.mimeType,
    width: readNumber(value, 'width'),
    height: readNumber(value, 'height'),
    byteSize: readNumber(value, 'byteSize'),
    base64: value.base64,
  };
}

function readPhoto(value: unknown): ArchivedProgressPhoto {
  if (!isRecord(value)) {
    throw new ProgressPhotoArchiveError('Une entrée de la sauvegarde est invalide.');
  }
  if (
    typeof value.date !== 'string'
    || typeof value.view !== 'string'
    || !PROGRESS_PHOTO_VIEWS.includes(value.view as ProgressPhotoView)
  ) {
    throw new ProgressPhotoArchiveError('La date ou la vue d’une photo sauvegardée est invalide.');
  }
  return {
    date: value.date,
    view: value.view as ProgressPhotoView,
    ...(typeof value.weightKg === 'number' ? { weightKg: value.weightKg } : {}),
    ...(typeof value.note === 'string' && value.note ? { note: value.note } : {}),
    ...(typeof value.originalFileName === 'string' && value.originalFileName
      ? { originalFileName: value.originalFileName }
      : {}),
    original: readAsset(value.original),
    thumbnail: readAsset(value.thumbnail),
  };
}

function parseEnvelope(serialized: string): ProgressPhotoArchiveEnvelope {
  if (new Blob([serialized]).size > MAX_PROGRESS_PHOTO_ARCHIVE_BYTES) {
    throw new ProgressPhotoArchiveError('Cette archive dépasse la limite de 100 Mo.');
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(serialized);
  } catch (error) {
    throw new ProgressPhotoArchiveError('Le fichier n’est pas une archive photo SportPilot valide.', { cause: error });
  }
  if (!isRecord(parsed)) {
    throw new ProgressPhotoArchiveError('Le fichier ne contient pas une archive photo valide.');
  }
  if (
    parsed.format !== PROGRESS_PHOTO_ARCHIVE_FORMAT
    || parsed.schemaVersion !== PROGRESS_PHOTO_ARCHIVE_VERSION
    || !Array.isArray(parsed.photos)
  ) {
    throw new ProgressPhotoArchiveError('Cette version de sauvegarde photo n’est pas compatible.');
  }
  return {
    format: PROGRESS_PHOTO_ARCHIVE_FORMAT,
    schemaVersion: PROGRESS_PHOTO_ARCHIVE_VERSION,
    exportedAt: typeof parsed.exportedAt === 'string'
      ? parsed.exportedAt
      : new Date(0).toISOString(),
    photos: parsed.photos.map(readPhoto),
  };
}

function restoredAsset(asset: ArchivedAsset): ProcessedProgressPhotoImage {
  const bytes = base64ToBytes(asset.base64);
  if (bytes.byteLength !== asset.byteSize) {
    throw new ProgressPhotoArchiveError('La taille d’une image sauvegardée ne correspond pas à son contenu.');
  }
  return {
    blob: new Blob([bytes], { type: asset.mimeType }),
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    byteSize: asset.byteSize,
  };
}

function duplicateKey(photo: Pick<ProgressPhoto, 'date' | 'view' | 'byteSize' | 'width' | 'height'>): string {
  return [photo.date, photo.view, photo.byteSize, photo.width, photo.height].join('|');
}

export async function createProgressPhotoArchive(
  repository: ProgressPhotoRepository,
): Promise<string> {
  const photos = await repository.listAll();
  const archived = await Promise.all(photos.map(async (photo) => {
    const withAssets = await repository.getWithAssets(photo.id);
    if (!withAssets) {
      throw new ProgressPhotoArchiveError(
        `La photo du ${photo.date} est incomplète et ne peut pas être exportée.`,
      );
    }
    return {
      date: photo.date,
      view: photo.view,
      ...(photo.weightKg === undefined ? {} : { weightKg: photo.weightKg }),
      ...(photo.note ? { note: photo.note } : {}),
      ...(photo.originalFileName ? { originalFileName: photo.originalFileName } : {}),
      original: await archiveAsset(withAssets.original),
      thumbnail: await archiveAsset(withAssets.thumbnail),
    } satisfies ArchivedProgressPhoto;
  }));

  return JSON.stringify({
    format: PROGRESS_PHOTO_ARCHIVE_FORMAT,
    schemaVersion: PROGRESS_PHOTO_ARCHIVE_VERSION,
    exportedAt: new Date().toISOString(),
    photos: archived,
  } satisfies ProgressPhotoArchiveEnvelope);
}

export async function importProgressPhotoArchive(
  repository: ProgressPhotoRepository,
  serialized: string,
): Promise<ProgressPhotoArchiveImportResult> {
  const envelope = parseEnvelope(serialized);
  const existing = await repository.listAll();
  const existingKeys = new Set(existing.map(duplicateKey));
  let imported = 0;
  let skipped = 0;

  for (const photo of envelope.photos) {
    const key = duplicateKey({
      date: photo.date,
      view: photo.view,
      byteSize: photo.original.byteSize,
      width: photo.original.width,
      height: photo.original.height,
    });
    if (existingKeys.has(key)) {
      skipped += 1;
      continue;
    }
    await repository.create({
      date: photo.date,
      view: photo.view,
      ...(photo.weightKg === undefined ? {} : { weightKg: photo.weightKg }),
      ...(photo.note ? { note: photo.note } : {}),
      ...(photo.originalFileName ? { originalFileName: photo.originalFileName } : {}),
      original: restoredAsset(photo.original),
      thumbnail: restoredAsset(photo.thumbnail),
    });
    existingKeys.add(key);
    imported += 1;
  }

  return { imported, skipped };
}
