import {
  SYNC_PROTOTYPE_DATABASE_VERSION,
  SYNC_PROTOTYPE_TABLE_NAMES,
} from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import {
  assertSocialCloudActivitySnapshotContractIntegrity,
  SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_CONTRACT_VERSION,
  SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_FORBIDDEN_BEHAVIORS,
} from '@/domain/friends/socialCloudActivitySnapshot';

describe('readiness snapshots sociaux cloud 0.28.0 F6', () => {
  it('valide le contrat de publication distante filtrée', () => {
    expect(SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_CONTRACT_VERSION).toBe('0.28.0-f6');
    expect(SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_FORBIDDEN_BEHAVIORS).toContain('rawActivityCloudWrite');
    expect(SOCIAL_CLOUD_ACTIVITY_SNAPSHOT_FORBIDDEN_BEHAVIORS).toContain('messaging');
    expect(assertSocialCloudActivitySnapshotContractIntegrity()).toBe(true);
  });

  it('confirme le runtime Dexie Cloud v15 avec table snapshots sociaux', () => {
    expect(SYNC_PROTOTYPE_DATABASE_VERSION).toBe(15);
    expect(SYNC_PROTOTYPE_TABLE_NAMES).toContain('socialActivitySnapshots');
  });
});
