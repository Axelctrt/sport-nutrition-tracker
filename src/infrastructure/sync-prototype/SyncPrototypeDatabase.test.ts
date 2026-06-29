import { DEFAULT_DATABASE_NAME } from '@/infrastructure/database/AppDatabase';
import {
  createSyncPrototypeDatabase,
  SYNC_PROTOTYPE_DATABASE_NAME,
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('base isolée du prototype Dexie Cloud', () => {
  it('reste distincte de la base SportPilot réelle', () => {
    expect(SYNC_PROTOTYPE_DATABASE_NAME).not.toBe(DEFAULT_DATABASE_NAME);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(1);
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toEqual([
      'weights',
      'deletionRecords',
    ]);
  });

  it('configure uniquement les deux tables du prototype avec authentification OTP', () => {
    const database = createSyncPrototypeDatabase({
      enabled: true,
      databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
    });

    expect(database.cloud.options).toEqual(
      expect.objectContaining({
        databaseUrl: 'https://sportpilot-prototype.dexie.cloud',
        requireAuth: false,
        customLoginGui: true,
        tryUseServiceWorker: false,
        nameSuffix: true,
        socialAuth: false,
      }),
    );
    expect(database.table('weights').schema.primKey.keyPath).toBe('id');
    expect(database.table('deletionRecords').schema.primKey.keyPath).toBe('id');

    database.close();
  });

  it('refuse toute création lorsque le prototype est désactivé', () => {
    expect(() =>
      createSyncPrototypeDatabase({ enabled: false }),
    ).toThrow('désactivé');
  });
});
