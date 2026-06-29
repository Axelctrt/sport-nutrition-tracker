import Dexie from 'dexie';

import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  CURRENT_DATABASE_VERSION,
  DATABASE_VERSION_3,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion3 } from '@/infrastructure/database/schema';

describe('migration de la corbeille locale', () => {
  it('préserve les données existantes et crée une corbeille vide', async () => {
    const databaseName = `sportpilot-trash-migration-${crypto.randomUUID()}`;
    const previousDatabase = new Dexie(databaseName);
    let upgradedDatabase: AppDatabase | undefined;

    try {
      previousDatabase
        .version(DATABASE_VERSION_3)
        .stores(schemaVersion3);
      await previousDatabase.open();

      await previousDatabase.table('activities').add({
        id: 'activity-before-trash',
        type: 'running',
        date: '2026-06-28',
        durationMinutes: 45,
        createdAt: '2026-06-28T08:00:00.000Z',
        updatedAt: '2026-06-28T08:00:00.000Z',
      });
      await previousDatabase.table('weights').add({
        id: 'weight-before-trash',
        date: '2026-06-28',
        weightKg: 60.2,
        createdAt: '2026-06-28T07:00:00.000Z',
        updatedAt: '2026-06-28T07:00:00.000Z',
      });

      previousDatabase.close();

      upgradedDatabase = new AppDatabase(databaseName);
      await upgradedDatabase.open();

      expect(upgradedDatabase.verno).toBe(CURRENT_DATABASE_VERSION);
      expect(CURRENT_DATABASE_VERSION).toBe(5);
      expect(
        await upgradedDatabase.activities.get('activity-before-trash'),
      ).toBeDefined();
      expect(
        await upgradedDatabase.weights.get('weight-before-trash'),
      ).toBeDefined();
      expect(await upgradedDatabase.trashItems.count()).toBe(0);
    } finally {
      previousDatabase.close();
      upgradedDatabase?.close();
      await Dexie.delete(databaseName);
    }
  });
});
