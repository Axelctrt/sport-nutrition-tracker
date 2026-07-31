import {
  createProgressPhotoArchive,
  importProgressPhotoArchive,
  ProgressPhotoArchiveError,
} from '@/application/progress-photos/progressPhotoArchiveService';
import type {
  ProcessedProgressPhotoImage,
  ProgressPhoto,
  ProgressPhotoAsset,
  ProgressPhotoView,
} from '@/domain/models/progressPhoto';
import type {
  CreateProgressPhotoInput,
  ProgressPhotoCleanupResult,
  ProgressPhotoRepository,
  ProgressPhotoWithAssets,
} from '@/infrastructure/repositories/contracts/ProgressPhotoRepository';

function image(content: string, width = 1200, height = 1600): ProcessedProgressPhotoImage {
  const blob = new Blob([content], { type: 'image/jpeg' });
  return {
    blob,
    mimeType: blob.type,
    width,
    height,
    byteSize: blob.size,
  };
}

function readBlobAsText(blob: Blob): Promise<string> {
  if (typeof blob.text === 'function') {
    return blob.text();
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error('Lecture impossible.'));
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
    reader.readAsText(blob);
  });
}

class InMemoryProgressPhotoRepository implements ProgressPhotoRepository {
  private readonly photos = new Map<string, ProgressPhoto>();
  private readonly assets = new Map<string, ProgressPhotoAsset>();
  private sequence = 0;

  async listAll(): Promise<ProgressPhoto[]> {
    return [...this.photos.values()];
  }

  async listByView(view: ProgressPhotoView): Promise<ProgressPhoto[]> {
    return [...this.photos.values()].filter((photo) => photo.view === view);
  }

  async getById(photoId: string): Promise<ProgressPhoto | undefined> {
    return this.photos.get(photoId);
  }

  async getAsset(assetId: string): Promise<ProgressPhotoAsset | undefined> {
    return this.assets.get(assetId);
  }

  async getWithAssets(photoId: string): Promise<ProgressPhotoWithAssets | undefined> {
    const photo = this.photos.get(photoId);
    if (!photo) return undefined;
    const original = this.assets.get(photo.originalAssetId);
    const thumbnail = this.assets.get(photo.thumbnailAssetId);
    if (!original || !thumbnail) return undefined;
    return { photo, original, thumbnail };
  }

  async create(input: CreateProgressPhotoInput): Promise<ProgressPhoto> {
    this.sequence += 1;
    const id = `progress-photo-${this.sequence}`;
    const originalAssetId = `${id}-original`;
    const thumbnailAssetId = `${id}-thumbnail`;
    const timestamp = `2026-07-31T10:00:0${this.sequence}.000Z`;

    const photo: ProgressPhoto = {
      id,
      date: input.date,
      view: input.view,
      ...(input.weightKg === undefined ? {} : { weightKg: input.weightKg }),
      ...(input.note ? { note: input.note } : {}),
      ...(input.originalFileName ? { originalFileName: input.originalFileName } : {}),
      originalAssetId,
      thumbnailAssetId,
      mimeType: input.original.mimeType,
      width: input.original.width,
      height: input.original.height,
      byteSize: input.original.byteSize,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const original: ProgressPhotoAsset = {
      id: originalAssetId,
      photoId: id,
      kind: 'original',
      ...input.original,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const thumbnail: ProgressPhotoAsset = {
      id: thumbnailAssetId,
      photoId: id,
      kind: 'thumbnail',
      ...input.thumbnail,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    this.photos.set(id, photo);
    this.assets.set(originalAssetId, original);
    this.assets.set(thumbnailAssetId, thumbnail);
    return photo;
  }

  async delete(photoId: string): Promise<void> {
    const photo = this.photos.get(photoId);
    if (!photo) return;
    this.assets.delete(photo.originalAssetId);
    this.assets.delete(photo.thumbnailAssetId);
    this.photos.delete(photoId);
  }

  async clearAll(): Promise<void> {
    this.photos.clear();
    this.assets.clear();
  }

  async cleanupOrphans(): Promise<ProgressPhotoCleanupResult> {
    return { removedAssets: 0, removedPhotos: 0 };
  }
}

describe('progressPhotoArchiveService', () => {
  it('exporte puis restaure les métadonnées et les deux images', async () => {
    const source = new InMemoryProgressPhotoRepository();
    const target = new InMemoryProgressPhotoRepository();

    await source.create({
      date: '2026-07-31',
      view: 'front',
      weightKg: 72.5,
      note: 'Même lumière.',
      originalFileName: 'progression.jpg',
      original: image('original-photo'),
      thumbnail: image('thumbnail-photo', 360, 480),
    });

    const serialized = await createProgressPhotoArchive(source);
    const result = await importProgressPhotoArchive(target, serialized);

    expect(result).toEqual({ imported: 1, skipped: 0 });
    const restored = (await target.listAll())[0];
    expect(restored).toMatchObject({
      date: '2026-07-31',
      view: 'front',
      weightKg: 72.5,
      note: 'Même lumière.',
      originalFileName: 'progression.jpg',
    });
    const withAssets = restored
      ? await target.getWithAssets(restored.id)
      : undefined;
    expect(withAssets).toBeDefined();
    expect(await readBlobAsText(withAssets!.original.blob)).toBe('original-photo');
    expect(await readBlobAsText(withAssets!.thumbnail.blob)).toBe('thumbnail-photo');
  });

  it('ignore les doublons lors d’une seconde restauration', async () => {
    const repository = new InMemoryProgressPhotoRepository();
    await repository.create({
      date: '2026-07-30',
      view: 'back',
      original: image('same-original'),
      thumbnail: image('same-thumbnail', 360, 480),
    });
    const serialized = await createProgressPhotoArchive(repository);

    expect(await importProgressPhotoArchive(repository, serialized)).toEqual({
      imported: 0,
      skipped: 1,
    });
    expect(await repository.listAll()).toHaveLength(1);
  });

  it('refuse les fichiers incompatibles ou altérés', async () => {
    const repository = new InMemoryProgressPhotoRepository();

    await expect(importProgressPhotoArchive(
      repository,
      JSON.stringify({ format: 'other', schemaVersion: 1, photos: [] }),
    )).rejects.toBeInstanceOf(ProgressPhotoArchiveError);

    await expect(importProgressPhotoArchive(
      repository,
      JSON.stringify({
        format: 'sportpilot-progress-photos',
        schemaVersion: 1,
        exportedAt: '2026-07-31T10:00:00.000Z',
        photos: [{
          date: '2026-07-31',
          view: 'front',
          original: {
            mimeType: 'image/jpeg',
            width: 100,
            height: 100,
            byteSize: 999,
            base64: btoa('short'),
          },
          thumbnail: {
            mimeType: 'image/jpeg',
            width: 50,
            height: 50,
            byteSize: 5,
            base64: btoa('short'),
          },
        }],
      }),
    )).rejects.toThrow('taille');
  });
});
