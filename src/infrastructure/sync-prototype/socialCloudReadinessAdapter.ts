import type { EntityId } from '@/domain/models/common';
import type { SocialCloudReadinessReport } from '@/application/friends/socialCloudReadinessService';
import { buildSocialCloudReadinessReport } from '@/application/friends/socialCloudReadinessService';
import type { SyncPrototypeConfig } from '@/infrastructure/sync-prototype/syncPrototypeConfig';

export function buildSyncPrototypeSocialCloudReadiness(
  config: SyncPrototypeConfig,
  authenticatedUserId?: EntityId | string,
): SocialCloudReadinessReport {
  if (!config.enabled) {
    return buildSocialCloudReadinessReport({
      syncPrototypeEnabled: false,
      socialCloudEnabled: false,
    });
  }

  return buildSocialCloudReadinessReport({
    syncPrototypeEnabled: true,
    socialCloudEnabled: config.realSocialCloudEnabled,
    databaseUrl: config.databaseUrl,
    ...(authenticatedUserId === undefined ? {} : { authenticatedUserId }),
  });
}
