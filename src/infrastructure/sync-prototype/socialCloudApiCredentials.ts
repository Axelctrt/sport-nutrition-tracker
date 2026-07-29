import type { EntityId } from '@/domain/models/common';
import type { SocialActivitySnapshotCloudCredentials } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import { getSyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';

export type SocialCloudApiCredentialsProvider = () =>
  | SocialActivitySnapshotCloudCredentials
  | undefined
  | Promise<SocialActivitySnapshotCloudCredentials | undefined>;

export async function readRuntimeSocialCloudApiCredentials(): Promise<
  SocialActivitySnapshotCloudCredentials | undefined
> {
  let client;
  try {
    client = getSyncPrototypeClient();
  } catch {
    return undefined;
  }
  if (client.ensureValidCloudCredentials) {
    return client.ensureValidCloudCredentials();
  }
  return client.getCloudCredentials?.();
}

export async function resolveSocialCloudApiCredentials(
  provider: SocialCloudApiCredentialsProvider | undefined,
  expectedUserId?: EntityId,
): Promise<SocialActivitySnapshotCloudCredentials | undefined> {
  const credentials = await (provider ?? readRuntimeSocialCloudApiCredentials)();
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
