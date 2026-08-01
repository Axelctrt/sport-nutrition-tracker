import type {
  ProgressPhoto,
  ProgressPhotoAsset,
  ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import type {
  AppDatabase,
  StoredProgressPhotoAsset,
} from '@/infrastructure/database/AppDatabase';
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

function isBlob(value: Blob | ArrayBuffer): value is Blob {
  return Object.prototype.toString.call(value) === '[object Blob]';
}

function materializeAsset(asset: StoredProgressPhotoAsset): ProgressPhotoAsset {
  if (isBlob(asset.blob)) return asset as ProgressPhotoAsset;
  return {
    ...asset,
    blob: new Blob([asset.blob], { type: asset.mimeType }),
  };
}

function readBlobAsArrayBuffer(blob: Blob): Promise<ArrayBuffer> {
  if (typeof blob.arrayBuffer === 'function') {
    return blob.arrayBuffer();
  }
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new Error('Blob binary data is unavailable.'));
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (reader.result instanceof ArrayBuffer) {
        resolve(reader.result);
        return;
      }
      reject(new Error('Blob binary data is unavailable.'));
    };
    reader.onerror = () => reject(
      reader.error ?? new Error('Blob binary data could not be read.'),
    );
    reader.readAsArrayBuffer(blob);
  });
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
      async () => {
        const asset = await this.database.progressPhotoAssets.get(assetId);
        return asset ? materializeAsset(asset) : undefined;
      },
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
          return {
            photo,
            original: materializeAsset(original),
            thumbnail: materializeAsset(thumbnail),
          };
        },
      ),
    );
  }

  create(input: CreateProgressPhotoInput): Promise<ProgressPhoto> {
    return runRepositoryOperation(
      'create',
      'Impossible d’enregistrer la photo de progression.',
      async () => {
        const [originalBytes, thumbnailBytes] = await Promise.all([
          readBlobAsArrayBuffer(input.original.blob),
          readBlobAsArrayBuffer(input.thumbnail.blob),
        ]);
        return this.database.transaction(
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
            const original = createEntity<StoredProgressPhotoAsset>({
              photoId,
              kind: 'original',
              blob: originalBytes,
              mimeType: input.original.mimeType,
              width: input.original.width,
              height: input.original.height,
              byteSize: input.original.byteSize,
            }, originalAssetId, photo.createdAt);
            const thumbnail = createEntity<StoredProgressPhotoAsset>({
              photoId,
              kind: 'thumbnail',
              blob: thumbnailBytes,
              mimeType: input.thumbnail.mimeType,
              width: input.thumbnail.width,
              height: input.thumbnail.height,
              byteSize: input.thumbnail.byteSize,
            }, thumbnailAssetId, photo.createdAt);

            await this.database.progressPhotoAssets.bulkAdd([original, thumbnail]);
            await this.database.progressPhotos.add(photo);
            return photo;
          },
        );
      },
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
