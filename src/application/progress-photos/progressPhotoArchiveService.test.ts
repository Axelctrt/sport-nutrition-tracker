import Dexie from 'dexie';

import {
  createProgressPhotoArchive,
  importProgressPhotoArchive,
  ProgressPhotoArchiveError,
} from '@/application/progress-photos/progressPhotoArchiveService';
import type { ProcessedProgressPhotoImage } from '@/domain/models/progressPhoto';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieProgressPhotoRepository } from '@/infrastructure/repositories/dexie/DexieProgressPhotoRepository';

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

describe('progressPhotoArchiveService', () => {
  it('exporte puis restaure les métadonnées et les deux images', async () => {
    const sourceName = `sportpilot-photo-archive-source-${crypto.randomUUID()}`;
    const targetName = `sportpilot-photo-archive-target-${crypto.randomUUID()}`;
    const sourceDatabase = new AppDatabase(sourceName);
    const targetDatabase = new AppDatabase(targetName);
    const source = new DexieProgressPhotoRepository(sourceDatabase);
    const target = new DexieProgressPhotoRepository(targetDatabase);

    try {
      await Promise.all([sourceDatabase.open(), targetDatabase.open()]);
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
      expect(await withAssets?.original.blob.text()).toBe('original-photo');
      expect(await withAssets?.thumbnail.blob.text()).toBe('thumbnail-photo');
    } finally {
      sourceDatabase.close();
      targetDatabase.close();
      await Promise.all([Dexie.delete(sourceName), Dexie.delete(targetName)]);
    }
  });

  it('ignore les doublons lors d’une seconde restauration', async () => {
    const name = `sportpilot-photo-archive-dedupe-${crypto.randomUUID()}`;
    const database = new AppDatabase(name);
    const repository = new DexieProgressPhotoRepository(database);

    try {
      await database.open();
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
    } finally {
      database.close();
      await Dexie.delete(name);
    }
  });

  it('refuse les fichiers incompatibles ou altérés', async () => {
    const repository = {
      listAll: vi.fn().mockResolvedValue([]),
    };

    await expect(importProgressPhotoArchive(
      repository as never,
      JSON.stringify({ format: 'other', schemaVersion: 1, photos: [] }),
    )).rejects.toBeInstanceOf(ProgressPhotoArchiveError);

    await expect(importProgressPhotoArchive(
      repository as never,
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
