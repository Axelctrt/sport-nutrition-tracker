import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshotCloudCredentials } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import { getSyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';

export type SocialCloudApiCredentialsProvider = () =>
  SocialActivitySnapshotCloudCredentials | undefined;

export function readRuntimeSocialCloudApiCredentials():
  SocialActivitySnapshotCloudCredentials | undefined {
  try {
    return getSyncPrototypeClient().getCloudCredentials?.();
  } catch {
    return undefined;
  }
}

export function resolveSocialCloudApiCredentials(
  provider: SocialCloudApiCredentialsProvider | undefined,
  expectedUserId?: EntityId,
): SocialActivitySnapshotCloudCredentials | undefined {
  const credentials = (provider ?? readRuntimeSocialCloudApiCredentials)();
  if (!credentials?.userId.trim() || !credentials.accessToken.trim()) return undefined;
  if (expectedUserId && credentials.userId !== expectedUserId) return undefined;
  return credentials;
}

export function socialCloudApiHeaders(
  credentials: SocialActivitySnapshotCloudCredentials,
  withJsonBody = false,
): Record<string, string> {
  return {
    accept: 'application/json',
    authorization: `Bearer ${credentials.accessToken}`,
    ...(withJsonBody ? { 'content-type': 'application/json' } : {}),
  };
}
