import type {
  ProgressPhoto,
  ProgressPhotoAsset,
  ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import type { AppDatabase } from '@/infrastructure/database/AppDatabase';
import type {
  CreateProgressPhotoInput,
  ProgressPhotoCleanupResult,
  ProgressPhotoRepository,
  ProgressPhotoWithAssets,
} from '@/infrastructure/repositories/contracts/ProgressPhotoRepository';
import { runRepositoryOperation } from '@/infrastructure/repositories/dexie/repositoryOperation';
import {
  createEntity,
  createEntityId,
} from '@/shared/utils/entities';

function sortNewestFirst(photos: readonly ProgressPhoto[]): ProgressPhoto[] {
  return [...photos].sort((left, right) =>
    right.date.localeCompare(left.date)
    || right.createdAt.localeCompare(left.createdAt),
  );
}

export class DexieProgressPhotoRepository implements ProgressPhotoRepository {
  private readonly database: AppDatabase;

  constructor(database: AppDatabase) {
    this.database = database;
  }

  listAll(): Promise<ProgressPhoto[]> {
    return runRepositoryOperation<ProgressPhoto[]>(
      'read',
      'Impossible de charger les photos de progression.',
      async (): Promise<ProgressPhoto[]> => {
        const photos = await this.database.progressPhotos.toArray();
        return sortNewestFirst(photos);
      },
    );
  }

  listByView(view: ProgressPhotoView): Promise<ProgressPhoto[]> {
    return runRepositoryOperation<ProgressPhoto[]>(
      'read',
      'Impossible de charger les photos pour cette vue.',
      async (): Promise<ProgressPhoto[]> => {
        const photos = await this.database.progressPhotos
          .where('view')
          .equals(view)
          .toArray();
        return sortNewestFirst(photos);
      },
    );
  }

  getById(photoId: string): Promise<ProgressPhoto | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger cette photo de progression.',
      () => this.database.progressPhotos.get(photoId),
    );
  }

  getAsset(assetId: string): Promise<ProgressPhotoAsset | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger le fichier de cette photo.',
      () => this.database.progressPhotoAssets.get(assetId),
    );
  }

  getWithAssets(photoId: string): Promise<ProgressPhotoWithAssets | undefined> {
    return runRepositoryOperation(
      'read',
      'Impossible de charger cette photo de progression.',
      () => this.database.transaction(
        'r',
        this.database.progressPhotos,
        this.database.progressPhotoAssets,
        async () => {
          const photo = await this.database.progressPhotos.get(photoId);
          if (!photo) return undefined;
          const [original, thumbnail] = await Promise.all([
            this.database.progressPhotoAssets.get(photo.originalAssetId),
            this.database.progressPhotoAssets.get(photo.thumbnailAssetId),
          ]);
          if (!original || !thumbnail) return undefined;
          return { photo, original, thumbnail };
        },
      ),
    );
  }

  create(input: CreateProgressPhotoInput): Promise<ProgressPhoto> {
    return runRepositoryOperation(
      'create',
      'Impossible d’enregistrer la photo de progression.',
      () => this.database.transaction(
        'rw',
        this.database.progressPhotos,
        this.database.progressPhotoAssets,
        async () => {
          const photoId = createEntityId();
          const originalAssetId = `${photoId}:original`;
          const thumbnailAssetId = `${photoId}:thumbnail`;
          const photo = createEntity<ProgressPhoto>({
            date: input.date,
            view: input.view,
            ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
            ...(input.note?.trim() ? { note: input.note.trim() } : {}),
            ...(input.originalFileName?.trim()
              ? { originalFileName: input.originalFileName.trim() }
              : {}),
            originalAssetId,
            thumbnailAssetId,
            mimeType: input.original.mimeType,
            width: input.original.width,
            height: input.original.height,
            byteSize: input.original.byteSize,
          }, photoId);
          const original = createEntity<ProgressPhotoAsset>({
            photoId,
            kind: 'original',
            blob: input.original.blob,
            mimeType: input.original.mimeType,
            width: input.original.width,
            height: input.original.height,
            byteSize: input.original.byteSize,
          }, originalAssetId, photo.createdAt);
          const thumbnail = createEntity<ProgressPhotoAsset>({
            photoId,
            kind: 'thumbnail',
            blob: input.thumbnail.blob,
            mimeType: input.thumbnail.mimeType,
            width: input.thumbnail.width,
            height: input.thumbnail.height,
            byteSize: input.thumbnail.byteSize,
          }, thumbnailAssetId, photo.createdAt);

          await this.database.progressPhotoAssets.bulkAdd([original, thumbnail]);
          await this.database.progressPhotos.add(photo);
          return photo;
        },
      ),
    );
  }

  delete(photoId: string): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer la photo de progression.',
      () => this.database.transaction(
        'rw',
        this.database.progressPhotos,
        this.database.progressPhotoAssets,
        async () => {
          await this.database.progressPhotoAssets.where('photoId').equals(photoId).delete();
          await this.database.progressPhotos.delete(photoId);
        },
      ),
    );
  }

  clearAll(): Promise<void> {
    return runRepositoryOperation(
      'delete',
      'Impossible de supprimer les photos de progression.',
      () => this.database.transaction(
        'rw',
        this.database.progressPhotos,
        this.database.progressPhotoAssets,
        async () => {
          await this.database.progressPhotoAssets.clear();
          await this.database.progressPhotos.clear();
        },
      ),
    );
  }

  cleanupOrphans(): Promise<ProgressPhotoCleanupResult> {
    return runRepositoryOperation(
      'update',
      'Impossible de vérifier le stockage des photos de progression.',
      () => this.database.transaction(
        'rw',
        this.database.progressPhotos,
        this.database.progressPhotoAssets,
        async () => {
          const [photos, assets] = await Promise.all([
            this.database.progressPhotos.toArray(),
            this.database.progressPhotoAssets.toArray(),
          ]);
          const photoIds = new Set(photos.map(({ id }) => id));
          const orphanAssetIds = assets
            .filter(({ photoId }) => !photoIds.has(photoId))
            .map(({ id }) => id);
          if (orphanAssetIds.length) {
            await this.database.progressPhotoAssets.bulkDelete(orphanAssetIds);
          }

          const orphanAssetSet = new Set(orphanAssetIds);
          const remainingAssetIds = new Set(
            assets
              .filter(({ id }) => !orphanAssetSet.has(id))
              .map(({ id }) => id),
          );
          const invalidPhotos = photos.filter((photo) =>
            !remainingAssetIds.has(photo.originalAssetId)
            || !remainingAssetIds.has(photo.thumbnailAssetId),
          );
          const invalidPhotoIds = invalidPhotos.map(({ id }) => id);
          if (invalidPhotoIds.length) {
            await this.database.progressPhotoAssets
              .where('photoId')
              .anyOf(invalidPhotoIds)
              .delete();
            await this.database.progressPhotos.bulkDelete(invalidPhotoIds);
          }

          return {
            removedAssets: orphanAssetIds.length,
            removedPhotos: invalidPhotoIds.length,
          };
        },
      ),
    );
  }
}
