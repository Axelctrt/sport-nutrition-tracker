import {
  reconcileSocialIdentityWithCloudAccount,
  type SocialIdentityReconciliationGateway,
  type SocialIdentityReconciliationResult,
} from '@/application/friends/socialIdentityReconciliationService';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';
import type { SocialIdentity } from '@/domain/friends/socialIdentity';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSocialIdentityReconciliationGateway } from '@/infrastructure/sync-prototype/socialIdentityReconciliationGateway';

export interface RuntimeSocialIdentityReconciliationOptions {
  readonly identity: SocialIdentity;
  readonly repository: SocialIdentityRepository;
  readonly client?: Pick<SyncPrototypeClient, 'getCloudCredentials'>;
  readonly gateway?: SocialIdentityReconciliationGateway;
}

export async function reconcileRuntimeSocialIdentity(
  options: RuntimeSocialIdentityReconciliationOptions,
): Promise<SocialIdentityReconciliationResult> {
  let client = options.client;
  if (!client) {
    try {
      client = getSyncPrototypeClient();
    } catch {
      client = undefined;
    }
  }

  const credentials = client?.getCloudCredentials?.();
  return reconcileSocialIdentityWithCloudAccount({
    identity: options.identity,
    repository: options.repository,
    gateway: options.gateway ?? createSocialIdentityReconciliationGateway(),
    ...(credentials ? { credentials } : {}),
  });
}
