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

const SAFE_JPEG_BYTES = Uint8Array.from(
  atob('/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAAGAAgDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAABv/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AJABeKv/2Q=='),
  (character) => character.charCodeAt(0),
);

function jpegWithIccProfile(): Uint8Array {
  const iccProfileSegment = Uint8Array.from([
    0xff, 0xe2, 0x00, 0x10,
    0x49, 0x43, 0x43, 0x5f, 0x50, 0x52, 0x4f,
    0x46, 0x49, 0x4c, 0x45, 0x00, 0x01, 0x01,
  ]);
  const bytes = new Uint8Array(
    SAFE_JPEG_BYTES.byteLength + iccProfileSegment.byteLength,
  );
  bytes.set(SAFE_JPEG_BYTES.slice(0, 2), 0);
  bytes.set(iccProfileSegment, 2);
  bytes.set(SAFE_JPEG_BYTES.slice(2), 2 + iccProfileSegment.byteLength);
  return bytes;
}

function bytesToBase64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}

function image(): ProcessedProgressPhotoImage {
  const blob = new Blob([SAFE_JPEG_BYTES], { type: 'image/jpeg' });
  return {
    blob,
    mimeType: blob.type,
    width: 8,
    height: 6,
    byteSize: blob.size,
  };
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
      original: image(),
      thumbnail: image(),
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
    expect(withAssets!.original).toMatchObject({
      mimeType: 'image/jpeg',
      width: 8,
      height: 6,
      byteSize: SAFE_JPEG_BYTES.byteLength,
    });
    expect(withAssets!.thumbnail).toMatchObject({
      mimeType: 'image/jpeg',
      width: 8,
      height: 6,
      byteSize: SAFE_JPEG_BYTES.byteLength,
    });
  });

  it('ignore les doublons lors d’une seconde restauration', async () => {
    const repository = new InMemoryProgressPhotoRepository();
    await repository.create({
      date: '2026-07-30',
      view: 'back',
      original: image(),
      thumbnail: image(),
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

  it('valide toute l’archive avant la première écriture', async () => {
    const source = new InMemoryProgressPhotoRepository();
    const target = new InMemoryProgressPhotoRepository();
    await source.create({
      date: '2026-07-30',
      view: 'front',
      original: image(),
      thumbnail: image(),
    });
    await source.create({
      date: '2026-07-31',
      view: 'back',
      original: image(),
      thumbnail: image(),
    });

    const archive = JSON.parse(await createProgressPhotoArchive(source)) as {
      photos: Array<{ thumbnail: { byteSize: number } }>;
    };
    archive.photos[1]!.thumbnail.byteSize += 1;

    await expect(importProgressPhotoArchive(
      target,
      JSON.stringify(archive),
    )).rejects.toThrow('taille');
    expect(await target.listAll()).toHaveLength(0);
  });

  it('refuse les formats, dimensions et métadonnées hors contrat', async () => {
    const source = new InMemoryProgressPhotoRepository();
    const target = new InMemoryProgressPhotoRepository();
    await source.create({
      date: '2026-07-31',
      view: 'front',
      original: image(),
      thumbnail: image(),
    });
    const serialized = await createProgressPhotoArchive(source);

    const invalidMime = JSON.parse(serialized) as {
      photos: Array<{ original: { mimeType: string } }>;
    };
    invalidMime.photos[0]!.original.mimeType = 'image/png';
    await expect(importProgressPhotoArchive(
      target,
      JSON.stringify(invalidMime),
    )).rejects.toThrow('format');

    const oversized = JSON.parse(serialized) as {
      photos: Array<{ original: { width: number } }>;
    };
    oversized.photos[0]!.original.width = 2_049;
    await expect(importProgressPhotoArchive(
      target,
      JSON.stringify(oversized),
    )).rejects.toThrow('limites');

    const invalidDate = JSON.parse(serialized) as {
      photos: Array<{ date: string }>;
    };
    invalidDate.photos[0]!.date = '2026-02-31';
    await expect(importProgressPhotoArchive(
      target,
      JSON.stringify(invalidDate),
    )).rejects.toThrow('date');
  });

  it('retire le profil ICC ajouté par canvas sans affaiblir la déduplication', async () => {
    const source = new InMemoryProgressPhotoRepository();
    const target = new InMemoryProgressPhotoRepository();
    await source.create({
      date: '2026-07-31',
      view: 'front',
      original: image(),
      thumbnail: image(),
    });
    const archive = JSON.parse(await createProgressPhotoArchive(source)) as {
      photos: Array<{
        original: { base64: string; byteSize: number };
      }>;
    };
    const iccJpeg = jpegWithIccProfile();
    archive.photos[0]!.original.base64 = bytesToBase64(iccJpeg);
    archive.photos[0]!.original.byteSize = iccJpeg.byteLength;
    const legacyArchive = JSON.stringify(archive);

    expect(await importProgressPhotoArchive(target, legacyArchive)).toEqual({
      imported: 1,
      skipped: 0,
    });
    const restored = (await target.listAll())[0];
    expect(restored?.byteSize).toBe(SAFE_JPEG_BYTES.byteLength);
    expect(await importProgressPhotoArchive(target, legacyArchive)).toEqual({
      imported: 0,
      skipped: 1,
    });
  });
});
