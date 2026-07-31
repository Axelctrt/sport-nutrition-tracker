import Dexie from 'dexie';

import type { ProcessedProgressPhotoImage } from '@/domain/models/progressPhoto';
import type { WeightEntry } from '@/domain/models/weight';
import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import { DexieProgressPhotoRepository } from '@/infrastructure/repositories/dexie/DexieProgressPhotoRepository';
import { createEntity } from '@/shared/utils/entities';

function databaseName(label: string): string {
  return `sportpilot-progress-photo-${label}-${crypto.randomUUID()}`;
}

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

describe('DexieProgressPhotoRepository', () => {
  it('enregistre puis supprime les métadonnées et les deux assets dans la même base', async () => {
    const name = databaseName('atomic');
    const database = new AppDatabase(name);
    const repository = new DexieProgressPhotoRepository(database);

    try {
      await database.open();
      const saved = await repository.create({
        date: '2026-07-31',
        view: 'front',
        weightKg: 72.5,
        note: 'Lumière identique.',
        originalFileName: 'face.jpg',
        original: image('original'),
        thumbnail: image('thumbnail', 360, 480),
      });

      expect(await database.progressPhotos.count()).toBe(1);
      expect(await database.progressPhotoAssets.count()).toBe(2);
      expect((await repository.getWithAssets(saved.id))?.photo).toEqual(saved);
      expect((await repository.listByView('front')).map(({ id }) => id)).toEqual([saved.id]);

      await repository.delete(saved.id);

      expect(await database.progressPhotos.count()).toBe(0);
      expect(await database.progressPhotoAssets.count()).toBe(0);
    } finally {
      database.close();
      await Dexie.delete(name);
    }
  });

  it('isole strictement les photos de deux espaces de données', async () => {
    const guestName = databaseName('guest');
    const accountName = databaseName('account');
    const guestDatabase = new AppDatabase(guestName);
    const accountDatabase = new AppDatabase(accountName);
    const guestRepository = new DexieProgressPhotoRepository(guestDatabase);
    const accountRepository = new DexieProgressPhotoRepository(accountDatabase);

    try {
      await Promise.all([guestDatabase.open(), accountDatabase.open()]);
      await guestRepository.create({
        date: '2026-07-30',
        view: 'back',
        original: image('guest-original'),
        thumbnail: image('guest-thumbnail', 360, 480),
      });

      expect(await guestRepository.listAll()).toHaveLength(1);
      expect(await accountRepository.listAll()).toHaveLength(0);
      expect(await accountDatabase.progressPhotoAssets.count()).toBe(0);
    } finally {
      guestDatabase.close();
      accountDatabase.close();
      await Promise.all([Dexie.delete(guestName), Dexie.delete(accountName)]);
    }
  });

  it('répare les assets orphelins et les photos incomplètes', async () => {
    const name = databaseName('cleanup');
    const database = new AppDatabase(name);
    const repository = new DexieProgressPhotoRepository(database);

    try {
      await database.open();
      const saved = await repository.create({
        date: '2026-07-29',
        view: 'left',
        original: image('original'),
        thumbnail: image('thumbnail', 360, 480),
      });
      await database.progressPhotoAssets.delete(saved.thumbnailAssetId);
      await database.progressPhotoAssets.add({
        id: 'orphan:original',
        photoId: 'missing-photo',
        kind: 'original',
        blob: new Blob(['orphan'], { type: 'image/jpeg' }),
        mimeType: 'image/jpeg',
        width: 100,
        height: 100,
        byteSize: 6,
        createdAt: '2026-07-31T10:00:00.000Z',
        updatedAt: '2026-07-31T10:00:00.000Z',
      });

      const result = await repository.cleanupOrphans();

      expect(result).toEqual({ removedAssets: 1, removedPhotos: 1 });
      expect(await database.progressPhotos.count()).toBe(0);
      expect(await database.progressPhotoAssets.count()).toBe(0);
    } finally {
      database.close();
      await Dexie.delete(name);
    }
  });

  it('efface toutes les photos sans toucher aux autres tables', async () => {
    const name = databaseName('clear');
    const database = new AppDatabase(name);
    const repository = new DexieProgressPhotoRepository(database);

    try {
      await database.open();
      await repository.create({
        date: '2026-07-28',
        view: 'free',
        original: image('original'),
        thumbnail: image('thumbnail', 360, 480),
      });
      await database.weights.add(createEntity<WeightEntry>({
        date: '2026-07-28',
        weightKg: 72,
      }, 'weight-preserved'));

      await repository.clearAll();

      expect(await database.progressPhotos.count()).toBe(0);
      expect(await database.progressPhotoAssets.count()).toBe(0);
      expect(await database.weights.count()).toBe(1);
    } finally {
      database.close();
      await Dexie.delete(name);
    }
  });
});
