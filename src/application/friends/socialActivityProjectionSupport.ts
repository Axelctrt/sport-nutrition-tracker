import type { RecipientScopedSocialActivitySharingPolicy } from '@/domain/friends/socialActivitySharingPolicy';
import type { EntityId } from '@/domain/models/common';

export interface SocialActivityProjectionIdentity {
  readonly ownerUserId: EntityId;
  readonly recipientUserId: EntityId;
  readonly policy: RecipientScopedSocialActivitySharingPolicy;
}

export type PublishableSocialActivityPolicy = RecipientScopedSocialActivitySharingPolicy & {
  readonly publishSnapshot: true;
  readonly visibility: 'summary' | 'detailed' | 'custom';
};

export function isPublishableSocialActivityPolicy(
  policy: RecipientScopedSocialActivitySharingPolicy,
): policy is PublishableSocialActivityPolicy {
  return policy.publishSnapshot && policy.visibility !== 'private';
}

export function hasCommonSocialActivityField(
  policy: RecipientScopedSocialActivitySharingPolicy,
  field: RecipientScopedSocialActivitySharingPolicy['fields']['common'][number],
): boolean {
  return policy.fields.common.includes(field);
}

export function hasCardioSocialActivityField(
  policy: RecipientScopedSocialActivitySharingPolicy,
  field: RecipientScopedSocialActivitySharingPolicy['fields']['cardio'][number],
): boolean {
  return policy.fields.cardio.includes(field);
}

export function hasStrengthSocialActivityField(
  policy: RecipientScopedSocialActivitySharingPolicy,
  field: RecipientScopedSocialActivitySharingPolicy['fields']['strength'][number],
): boolean {
  return policy.fields.strength.includes(field);
}
