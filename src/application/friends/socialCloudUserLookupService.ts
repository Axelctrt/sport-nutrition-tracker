import type { EntityId } from '@/domain/models/common';
import {
  normalizeExactSocialCloudUserLookupResult,
  type ExactSocialCloudUserLookupReport,
} from '@/domain/friends/socialCloudUserLookup';
import { validateSocialHandle } from '@/domain/friends/socialIdentity';
import type { SocialUserLookupGateway } from '@/application/friends/socialIdentityService';

export interface LookupExactSocialCloudUserInput {
  readonly handle: string;
  readonly lookupGateway: SocialUserLookupGateway;
  readonly currentUserId?: EntityId;
}

export async function lookupExactSocialCloudUser(
  input: LookupExactSocialCloudUserInput,
): Promise<ExactSocialCloudUserLookupReport> {
  const validation = validateSocialHandle(input.handle);
  if (validation.status === 'invalid') {
    return normalizeExactSocialCloudUserLookupResult(input.handle, { status: 'invalidHandle' }, input.currentUserId);
  }

  const result = await input.lookupGateway.lookupByHandle(validation.handle);
  return normalizeExactSocialCloudUserLookupResult(validation.handle, result, input.currentUserId);
}
