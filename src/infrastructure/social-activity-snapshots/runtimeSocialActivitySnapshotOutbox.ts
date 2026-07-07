import { DexieSocialActivitySnapshotOutboxRepository } from '@/infrastructure/social-activity-snapshots/DexieSocialActivitySnapshotOutboxRepository';
import { SocialActivitySnapshotOutboxDatabase } from '@/infrastructure/social-activity-snapshots/SocialActivitySnapshotOutboxDatabase';

export const runtimeSocialActivitySnapshotOutboxDatabase =
  new SocialActivitySnapshotOutboxDatabase();

export const runtimeSocialActivitySnapshotOutboxRepository =
  new DexieSocialActivitySnapshotOutboxRepository(
    runtimeSocialActivitySnapshotOutboxDatabase,
  );
