import type { EntityId } from '@/domain/models/common';
import {
  evaluateSocialCloudReadiness,
  type SocialCloudBackendPort,
  type SocialCloudReadiness,
} from '@/domain/friends/socialCloudContract';
import { validateSocialHandle } from '@/domain/friends/socialIdentity';

export interface SocialCloudRuntimeState {
  readonly syncPrototypeEnabled: boolean;
  readonly socialCloudEnabled: boolean;
  readonly databaseUrl?: string;
  readonly authenticatedUserId?: EntityId | string;
}

export interface SocialCloudReadinessReport extends SocialCloudReadiness {
  readonly lookupFallbackMessage: string;
  readonly mutationFallbackMessage: string;
}

const unavailableMutation = {
  status: 'unavailable' as const,
  message: 'Backend social cloud indisponible en 0.28.0 F1 : contrat prêt, écriture réelle non branchée.',
};

export const unavailableSocialCloudBackend: SocialCloudBackendPort = {
  identity: {
    async readCurrentIdentity() {
      return undefined;
    },
    async publishIdentity() {
      return unavailableMutation;
    },
    async reserveHandle() {
      return unavailableMutation;
    },
    async lookupByHandle(handle) {
      const validation = validateSocialHandle(handle);
      if (validation.status === 'invalid') return { status: 'invalidHandle' };
      return { status: 'unavailable' };
    },
  },
  friendRequests: {
    async sendRequest() {
      return unavailableMutation;
    },
    async listIncomingRequests() {
      return [];
    },
    async listOutgoingRequests() {
      return [];
    },
    async updateRequestStatus() {
      return unavailableMutation;
    },
  },
  friendships: {
    async listFriendships() {
      return [];
    },
    async upsertFriendship() {
      return unavailableMutation;
    },
  },
  permissions: {
    async listPermissions() {
      return [];
    },
    async savePermission() {
      return unavailableMutation;
    },
  },
  snapshots: {
    async publishSnapshots() {
      return unavailableMutation;
    },
    async listFeedSnapshots() {
      return [];
    },
  },
};

export function buildSocialCloudReadinessReport(
  runtime: SocialCloudRuntimeState,
): SocialCloudReadinessReport {
  const readiness = evaluateSocialCloudReadiness(runtime);

  return {
    ...readiness,
    lookupFallbackMessage: readiness.canLookupUsers
      ? 'Recherche exacte cloud autorisée par le contrat.'
      : 'Recherche exacte cloud non branchée : fallback indisponible conservé.',
    mutationFallbackMessage: readiness.canSendFriendRequests
      ? 'Mutations sociales cloud autorisées par le contrat.'
      : 'Mutations sociales cloud non branchées : aucune donnée distante n’est écrite.',
  };
}
