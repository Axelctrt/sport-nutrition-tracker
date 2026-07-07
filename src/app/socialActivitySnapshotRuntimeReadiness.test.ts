import {
  reconcileCompletedStrengthSessionSocialSnapshots,
  reconcileStoredActivitySocialSnapshots,
  removePublishedSocialActivitySnapshots,
} from '@/application/friends/socialActivityPublicationService';
import { runSocialActivitySnapshotObserverBestEffort } from '@/application/friends/socialActivitySnapshotObserver';
import { SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION } from '@/domain/friends/socialActivitySnapshotOutbox';
import { databaseSchemaVersion } from '@/infrastructure/database/schema';
import {
  SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION,
} from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';
import { createRuntimeSocialActivitySnapshotObserver } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivitySnapshotObserver';
import { SYNC_PROTOTYPE_DATABASE_VERSION } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';

describe('readiness branchement runtime des snapshots sociaux 0.29.0 A5', () => {
  it('expose les opérations réelles de création, mise à jour, suppression et fin de séance', () => {
    expect(reconcileStoredActivitySocialSnapshots).toBeTypeOf('function');
    expect(reconcileCompletedStrengthSessionSocialSnapshots).toBeTypeOf('function');
    expect(removePublishedSocialActivitySnapshots).toBeTypeOf('function');
    expect(createRuntimeSocialActivitySnapshotObserver).toBeTypeOf('function');
    expect(runSocialActivitySnapshotObserverBestEffort).toBeTypeOf('function');
  });

  it('ne modifie aucun schéma publié avant la persistance cloud', () => {
    expect(databaseSchemaVersion).toBe(10);
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(14);
    expect(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_DATABASE_VERSION).toBe(1);
    expect(SOCIAL_ACTIVITY_SNAPSHOT_OUTBOX_RECORD_VERSION).toBe('0.29.0-a4');
  });
});
