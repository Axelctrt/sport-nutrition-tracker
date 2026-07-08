import type { EntityId, IsoDateTime } from '@/domain/models/common';
import type { SocialIdentity } from '@/domain/friends/socialIdentity';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';

export interface SocialIdentityCloudCredentials {
  readonly userId: string;
  readonly accessToken: string;
}

export interface SocialIdentityReconciliationInput {
  readonly previousUserId: EntityId;
  readonly handle: string;
  readonly displayName: string;
  readonly createdAt: IsoDateTime;
  readonly updatedAt: IsoDateTime;
  readonly handleUpdatedAt?: IsoDateTime;
}

export type SocialIdentityReconciliationStatus =
  | 'reconciled'
  | 'alreadyCanonical'
  | 'notConnected'
  | 'conflict'
  | 'unavailable';

export interface SocialIdentityReconciliationResult {
  readonly status: SocialIdentityReconciliationStatus;
  readonly identity: SocialIdentity;
  readonly migratedUserIds: readonly string[];
  readonly message: string;
}

export interface SocialIdentityReconciliationGateway {
  readonly reconcile: (
    credentials: SocialIdentityCloudCredentials,
    input: SocialIdentityReconciliationInput,
  ) => Promise<SocialIdentityReconciliationResult>;
}

export interface ReconcileSocialIdentityOptions {
  readonly identity: SocialIdentity;
  readonly repository: SocialIdentityRepository;
  readonly gateway: SocialIdentityReconciliationGateway;
  readonly credentials?: SocialIdentityCloudCredentials;
}

function sameIdentity(left: SocialIdentity, right: SocialIdentity): boolean {
  return left.userId === right.userId
    && left.handle === right.handle
    && left.displayName === right.displayName
    && left.createdAt === right.createdAt
    && left.updatedAt === right.updatedAt
    && left.handleUpdatedAt === right.handleUpdatedAt;
}

export async function reconcileSocialIdentityWithCloudAccount(
  options: ReconcileSocialIdentityOptions,
): Promise<SocialIdentityReconciliationResult> {
  const credentials = options.credentials;
  if (!credentials?.userId.trim() || !credentials.accessToken.trim()) {
    return {
      status: 'notConnected',
      identity: options.identity,
      migratedUserIds: [],
      message: 'Connexion Dexie Cloud requise pour réconcilier l’identité sociale.',
    };
  }

  const result = await options.gateway.reconcile(credentials, {
    previousUserId: options.identity.userId,
    handle: options.identity.handle,
    displayName: options.identity.displayName,
    createdAt: options.identity.createdAt,
    updatedAt: options.identity.updatedAt,
    ...(options.identity.handleUpdatedAt
      ? { handleUpdatedAt: options.identity.handleUpdatedAt }
      : {}),
  });

  if (!['reconciled', 'alreadyCanonical'].includes(result.status)) {
    return result;
  }

  if (result.identity.userId !== credentials.userId) {
    return {
      status: 'unavailable',
      identity: options.identity,
      migratedUserIds: [],
      message: 'Le serveur social a renvoyé une identité qui ne correspond pas au compte connecté.',
    };
  }

  if (!sameIdentity(options.identity, result.identity)) {
    await options.repository.saveIdentity(result.identity);
  }

  return result;
}
