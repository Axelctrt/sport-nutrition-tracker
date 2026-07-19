import { DexieSocialActivitySnapshotOutboxRepository } from '@/infrastructure/social-activity-snapshots/DexieSocialActivitySnapshotOutboxRepository';
import { SocialActivitySnapshotOutboxDatabase } from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';

export const runtimeSocialActivitySnapshotOutboxDatabase =
  new SocialActivitySnapshotOutboxDatabase();

export const runtimeSocialActivitySnapshotOutboxRepository =
  new DexieSocialActivitySnapshotOutboxRepository(
    runtimeSocialActivitySnapshotOutboxDatabase,
  );

export async function purgeRuntimeSocialActivitySnapshotOutbox(
  ownerUserId: string,
): Promise<number> {
  if (!ownerUserId.trim()) return 0;
  return runtimeSocialActivitySnapshotOutboxDatabase.records
    .where('ownerUserId')
    .equals(ownerUserId)
    .delete();
}
