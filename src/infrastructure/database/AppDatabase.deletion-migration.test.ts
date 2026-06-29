import Dexie from 'dexie';

import { AppDatabase } from '@/infrastructure/database/AppDatabase';
import {
  DATABASE_VERSION_7,
  DATABASE_VERSION_8,
} from '@/infrastructure/database/migrations/versions';
import { schemaVersion7 } from '@/infrastructure/database/schema';

describe('migration des marqueurs de suppression', () => {
  it('reprend la corbeille locale existante sans restaurer son contenu', async () => {
    const databaseName = `sportpilot-deletion-migration-${crypto.randomUUID()}`;
    const previousDatabase = new Dexie(databaseName);
    let upgradedDatabase: AppDatabase | undefined;

    try {
      previousDatabase
        .version(DATABASE_VERSION_7)
        .stores(schemaVersion7);
      await previousDatabase.open();

      await previousDatabase.table('trashItems').add({
        id: 'meal:meal-1',
        entityType: 'meal',
        entityId: 'meal-1',
        label: 'Déjeuner du 2026-06-29',
        deletedAt: '2026-06-29T12:00:00.000Z',
        purgeAt: '2026-07-29T12:00:00.000Z',
        payload: {
          meal: {
            id: 'meal-1',
            date: '2026-06-29',
            slot: 'lunch',
            createdAt: '2026-06-29T11:00:00.000Z',
            updatedAt: '2026-06-29T11:00:00.000Z',
          },
          entries: [
            {
              id: 'food-entry-1',
              date: '2026-06-29',
              mealId: 'meal-1',
              mealSlot: 'lunch',
              sourceType: 'product',
              reference: {
                sourceType: 'product',
                productId: 'product-1',
                inputMode: 'amount',
                inputQuantity: 100,
                normalizedAmount: 100,
                normalizedUnit: 'g',
                nutritionPer100Snapshot: {
                  caloriesKcal: 100,
                  proteinGrams: 5,
                  carbohydratesGrams: 10,
                  fatGrams: 2,
                },
              },
              createdAt: '2026-06-29T11:05:00.000Z',
              updatedAt: '2026-06-29T11:05:00.000Z',
            },
          ],
        },
      });
      previousDatabase.close();

      upgradedDatabase = new AppDatabase(databaseName);
      await upgradedDatabase.open();

      expect(upgradedDatabase.verno).toBe(DATABASE_VERSION_8);
      expect(await upgradedDatabase.trashItems.count()).toBe(1);
      expect(await upgradedDatabase.meals.count()).toBe(0);
      expect(
        (await upgradedDatabase.deletionRecords.toArray()).map(
          ({ id, status }) => ({ id, status }),
        ),
      ).toEqual(
        expect.arrayContaining([
          {
            id: 'deletion:meal:meal-1',
            status: 'deleted',
          },
          {
            id: 'deletion:foodEntry:food-entry-1',
            status: 'deleted',
          },
        ]),
      );
      expect(
        await upgradedDatabase.migrationJournal.get(
          `schema-version-${DATABASE_VERSION_8}`,
        ),
      ).toMatchObject({
        version: DATABASE_VERSION_8,
        previousVersion: DATABASE_VERSION_7,
        source: 'migration',
      });
    } finally {
      previousDatabase.close();
      upgradedDatabase?.close();
      await Dexie.delete(databaseName);
    }
  });
});
