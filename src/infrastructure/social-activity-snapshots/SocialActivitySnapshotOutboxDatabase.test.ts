import Dexie from 'dexie';

import {
  SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION,
  SocialActivitySnapshotOutboxDatabase,
} from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';

describe('SocialActivitySnapshotOutboxDatabase', () => {
  it('crée une base locale isolée sans addon cloud', async () => {
    const database = new SocialActivitySnapshotOutboxDatabase(
      `sportpilot-social-outbox-schema-${crypto.randomUUID()}`,
    );

    try {
      await database.open();
      expect(database.verno).toBe(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION);
      expect(database.tables.map(({ name }) => name)).toEqual(['records']);
      expect(database.records.schema.primKey.keyPath).toBe('id');
      expect(database.records.schema.idxByName.ownerUserId).toBeDefined();
      expect(database.records.schema.idxByName.deliveryStatus).toBeDefined();
      expect(database.records.schema.idxByName['[ownerUserId+sourceActivityId]']).toBeDefined();
    } finally {
      database.close();
      await Dexie.delete(database.name);
    }
  });
});
