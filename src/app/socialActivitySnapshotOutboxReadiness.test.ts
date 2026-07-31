import { SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION } from '@/domain/friends/socialActivitySnapshotOutbox';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_NAME,
  SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION,
  SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_TABLE_NAME,
} from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';
import {
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('readiness file locale des snapshots sociaux 0.29.0 A4', () => {
  it('conserve les schémas publiés du stockage principal et du prototype cloud', () => {
    expect(databaseSchemaVersion).toBe(12);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(16);
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toContain('socialActivitySnapshots');
  });

  it('isole la nouvelle file dans une base locale dédiée', () => {
    expect(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_NAME).toBe(
      'sportpilot-social-activity-snapshot-outbox',
    );
    expect(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION).toBe(1);
    expect(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_TABLE_NAME).toBe('records');
  });

  it('versionne séparément les métadonnées de livraison A4', () => {
    expect(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION).toBe('0.29.0-a4');
  });
});
