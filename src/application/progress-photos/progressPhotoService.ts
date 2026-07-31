import type { LocalDate } from '@/domain/models/common';
import {
  PROGRESS_PHOTO_VIEWS,
  type ProgressPhoto,
  type ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import {
  processProgressPhotoFile,
  type ProcessedProgressPhotoPair,
} from '@/application/progress-photos/progressPhotoImageService';
import type { ProgressPhotoRepository } from '@/infrastructure/repositories/contracts/ProgressPhotoRepository';
import { isValidLocalDate } from '@/shared/validation/localDate';

const STORAGE_SAFETY_MARGIN_BYTES = 5 * 1024 * 1024;

export interface SaveProgressPhotoInput {
  file: File;
  date: LocalDate;
  view: ProgressPhotoView;
  weightKg?: number;
  note?: string;
}

export interface ProgressPhotoStorageEstimate {
  usage?: number;
  quota?: number;
  remaining?: number;
}

export class ProgressPhotoValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProgressPhotoValidationError';
  }
}

export async function readProgressPhotoStorageEstimate(): Promise<ProgressPhotoStorageEstimate> {
  if (typeof navigator === 'undefined' || typeof navigator.storage?.estimate !== 'function') {
    return {};
  }
  const estimate = await navigator.storage.estimate();
  const usage = estimate.usage;
  const quota = estimate.quota;
  return {
    ...(usage === undefined ? {} : { usage }),
    ...(quota === undefined ? {} : { quota }),
    ...(usage === undefined || quota === undefined
      ? {}
      : { remaining: Math.max(0, quota - usage) }),
  };
}

function validateInput(input: SaveProgressPhotoInput): void {
  if (!isValidLocalDate(input.date)) {
    throw new ProgressPhotoValidationError('Choisis une date valide.');
  }
  if (!PROGRESS_PHOTO_VIEWS.includes(input.view)) {
    throw new ProgressPhotoValidationError('Choisis une vue valide.');
  }
  if (
    input.weightKg !== undefined
    && (!Number.isFinite(input.weightKg) || input.weightKg <= 0 || input.weightKg > 500)
  ) {
    throw new ProgressPhotoValidationError(
      'Le poids doit être compris entre 0 et 500 kg.',
    );
  }
  if ((input.note?.length ?? 0) > 5_000) {
    throw new ProgressPhotoValidationError(
      'La note ne peut pas dépasser 5 000 caractères.',
    );
  }
}

async function assertStorageCapacity(images: ProcessedProgressPhotoPair): Promise<void> {
  const estimate = await readProgressPhotoStorageEstimate();
  if (estimate.remaining === undefined) return;
  const required = images.original.byteSize
    + images.thumbnail.byteSize
    + STORAGE_SAFETY_MARGIN_BYTES;
  if (estimate.remaining < required) {
    throw new ProgressPhotoValidationError(
      'L’espace disponible sur cet appareil est insuffisant. Supprime une ancienne photo ou libère du stockage.',
    );
  }
}

export async function saveProgressPhoto(
  repository: ProgressPhotoRepository,
  input: SaveProgressPhotoInput,
): Promise<ProgressPhoto> {
  validateInput(input);
  const images = await processProgressPhotoFile(input.file);
  await assertStorageCapacity(images);
  const originalFileName = input.file.name?.trim() ?? '';
  return repository.create({
    date: input.date,
    view: input.view,
    ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
    ...(input.note?.trim() ? { note: input.note.trim() } : {}),
    ...(originalFileName ? { originalFileName } : {}),
    original: images.original,
    thumbnail: images.thumbnail,
  });
}
