import {
  Check,
  LockKeyhole,
  LoaderCircle,
  Send,
  ShieldCheck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';

import type { EntityId } from '@/domain/models/common';
import {
  createEmptyFriendsPrivacySnapshot,
  createFriendsPrivacyService,
  loadFriendsPrivacySnapshot,
  persistFriendsPrivacySnapshot,
  type FriendsPrivacyServiceActions,
  type FriendsPrivacyServiceState,
  type FriendsPrivacySnapshotRepository,
} from '@/application/friends/friendsPrivacyService';
import { prepareSocialActivityFeed } from '@/application/friends/socialActivityFeedService';
import {
  checkAccountSocialHandleAvailability,
  provisionAccountSocialIdentity,
} from '@/application/friends/accountSocialIdentityService';
import { SocialActivityCloudReadinessPanel } from '@/features/friends/components/SocialActivityCloudReadinessPanel';
import { SocialActivityFeedPanel } from '@/features/friends/components/SocialActivityFeedPanel';
import { SocialActivityFriendSharingSettings } from '@/features/friends/components/SocialActivitySharingSettings';
import { sendExactFriendRequest } from '@/application/friends/socialFriendRequestService';
import {
  cloudFriendRequestToLocalRequest,
  mergeCloudFriendRequestsIntoSnapshot,
  normalizeCloudFriendRequestForUser,
  synchronizeCloudFriendRequestsIntoSnapshot,
} from '@/domain/friends/socialCloudFriendRequest';
import {
  getCloudFriendshipCounterpartUserId,
  mergeCloudFriendshipsIntoSnapshot,
  synchronizeCloudFriendshipsIntoSnapshot,
} from '@/domain/friends/socialCloudFriendship';
import type {
  SocialCloudFriendPermissionPort,
  SocialCloudFriendRequestPort,
  SocialCloudFriendshipPort,
  SocialCloudIdentityPort,
} from '@/domain/friends/socialCloudContract';
import {
  checkSocialHandleAvailability,
  loadSocialIdentity,
  saveSocialIdentity,
  type SocialIdentityRepository,
  type SocialUserLookupGateway,
} from '@/application/friends/socialIdentityService';
import {
  FRIEND_PROFILE_VISIBILITY_LABELS,
  acceptFriendRequest,
  declineFriendRequest,
  ensureFriendActivityPermissions,
  evaluateFriendScopedActivitySharingGuard,
  selectFriendActivityPermission,
  summarizeFriendsPrivacy,
  type FriendActivityPermissionLevel,
  type FriendProfileSummary,
  type FriendRequest,
  type FriendsPrivacySnapshot,
  type FriendVisibilityLevel,
} from '@/domain/friends/friendship';
import {
  createDefaultSocialIdentity,
  formatSocialHandle,
  validateSocialHandle,
  type SocialIdentity,
  type SocialIdentityAvailabilityResult,
} from '@/domain/friends/socialIdentity';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import {
  DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION,
  type SocialActivityFieldSelection,
} from '@/domain/friends/socialActivitySharingPolicy';
import { appDatabase, activeDataSpace } from '@/infrastructure/database/database';
import { DexieFriendsPrivacyRepository } from '@/infrastructure/repositories/dexie/DexieFriendsPrivacyRepository';
import { DexieSocialIdentityRepository } from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository';
import { supportsProfiledSocialFriendRequestsPort } from '@/infrastructure/sync-prototype/socialFriendRequestsGateway';
import { createRuntimeSocialCloudUserLookupGateway } from '@/infrastructure/sync-prototype/realSocialCloudUserLookupGateway';
import { getSyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { reconcileRuntimeSocialIdentity } from '@/infrastructure/sync-prototype/runtimeSocialIdentityReconciliation';
import type { SocialIdentityReconciliationResult } from '@/application/friends/socialIdentityReconciliationService';
import { createRuntimeSocialCloudFriendRequestPort } from '@/infrastructure/sync-prototype/realSocialCloudFriendRequestService';
import { createSocialFriendsGateway, type SocialFriendsGateway } from '@/infrastructure/sync-prototype/socialFriendsGateway';
import type { SocialActivitySnapshotCloudCredentials } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import {
  createSocialActivityFeedCloudGateway,
  type SocialActivityFeedCloudGateway,
} from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';
import { createRuntimeSocialCloudIdentityPort } from '@/infrastructure/sync-prototype/realSocialCloudIdentityService';
import { reconcileRuntimeSocialActivityPrivacy } from '@/infrastructure/social-activity-snapshots/runtimeSocialActivityPrivacyReconciliation';
import { notifySyncLocalDataChanged } from '@/application/sync/syncLocalChangeEvents';
import { SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT } from '@/infrastructure/sync-prototype/socialActivityPrivacySyncEvents';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';


function currentAccountUserId(): string | undefined {
  if (activeDataSpace.kind !== 'account') return undefined;
  try {
    return getSyncPrototypeClient().getSnapshot().account.userId;
  } catch {
    return undefined;
  }
}

interface FriendsPrivacyPageProps {
  readonly initialSnapshot?: FriendsPrivacySnapshot;
  readonly repository?: FriendsPrivacySnapshotRepository;
  readonly initialIdentity?: SocialIdentity;
  readonly identityRepository?: SocialIdentityRepository;
  readonly lookupGateway?: SocialUserLookupGateway;
  readonly cloudIdentityPort?: SocialCloudIdentityPort;
  readonly cloudFriendRequestPort?: SocialCloudFriendRequestPort;
  readonly cloudFriendshipPort?: SocialCloudFriendshipPort;
  readonly cloudFriendPermissionPort?: SocialCloudFriendPermissionPort;
  readonly socialFriendsGateway?: SocialFriendsGateway;
  readonly initialActivitySnapshots?: readonly SocialActivitySnapshot[];
  readonly activityFeedCloudGateway?: SocialActivityFeedCloudGateway;
  readonly activityFeedCloudCredentials?: () =>
    | SocialActivitySnapshotCloudCredentials
    | undefined
    | Promise<SocialActivitySnapshotCloudCredentials | undefined>;
  readonly activityFeedOnline?: () => boolean;
  readonly activityFeedCloudSubscription?: (listener: () => void) => () => void;
  readonly privacyReconciliation?: () => Promise<unknown>;
  readonly identityReconciliation?: (identity: SocialIdentity) => Promise<SocialIdentityReconciliationResult>;
}

const visibilityOptions: readonly FriendVisibilityLevel[] = ['private', 'friends', 'public'];
function subscribeRuntimeSocialActivityFeed(listener: () => void): () => void {
  try {
    return getSyncPrototypeClient().subscribe(listener);
  } catch {
    return () => undefined;
  }
}

async function readRuntimeSocialActivityFeedCredentials(): Promise<
  SocialActivitySnapshotCloudCredentials | undefined
> {
  try {
    const client = getSyncPrototypeClient();
    return client.ensureValidCloudCredentials
      ? client.ensureValidCloudCredentials()
      : client.getCloudCredentials?.();
  } catch {
    return undefined;
  }
}

const initialAvailability: SocialIdentityAvailabilityResult = {
  status: 'idle',
  message: 'Vérification non lancée.',
};

function formatRequestDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date inconnue';

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function requestStatusLabel(request: FriendRequest): string {
  if (request.status === 'accepted') return 'Acceptée';
  if (request.status === 'declined') return 'Refusée';
  return request.direction === 'incoming' ? 'À valider' : 'Envoyée';
}

export function FriendsPrivacyPage({
  initialSnapshot,
  repository,
  initialIdentity,
  identityRepository,
  lookupGateway,
  cloudIdentityPort,
  cloudFriendRequestPort,
  cloudFriendshipPort,
  cloudFriendPermissionPort,
  socialFriendsGateway,
  initialActivitySnapshots,
  activityFeedCloudGateway,
  activityFeedCloudCredentials,
  activityFeedOnline,
  activityFeedCloudSubscription,
  privacyReconciliation,
  identityReconciliation,
}: FriendsPrivacyPageProps = {}) {
  const [defaultRepository] = useState(() =>
    initialSnapshot ? undefined : new DexieFriendsPrivacyRepository(appDatabase),
  );
  const [defaultIdentityRepository] = useState(() =>
    repository || initialSnapshot || initialIdentity ? undefined : new DexieSocialIdentityRepository(appDatabase),
  );
  const activeRepository = repository ?? defaultRepository;
  const activeIdentityRepository = identityRepository ?? defaultIdentityRepository;
  const [defaultLookupGateway] = useState(() => createRuntimeSocialCloudUserLookupGateway());
  const [defaultCloudIdentityPort] = useState(() => (
    initialIdentity || identityRepository ? undefined : createRuntimeSocialCloudIdentityPort()
  ));
  const [defaultCloudFriendRequestPort] = useState(() => (
    initialSnapshot || repository || lookupGateway ? undefined : createRuntimeSocialCloudFriendRequestPort()
  ));
  const [defaultSocialFriendsGateway] = useState(() => (
    import.meta.env.MODE === 'test' || socialFriendsGateway || cloudFriendshipPort || cloudFriendPermissionPort
      ? undefined
      : createSocialFriendsGateway()
  ));
  const [defaultActivityFeedCloudGateway] = useState(() => (
    import.meta.env.MODE === 'test' ? undefined : createSocialActivityFeedCloudGateway()
  ));
  const activeLookupGateway = lookupGateway ?? defaultLookupGateway;
  const activeCloudIdentityPort = cloudIdentityPort ?? defaultCloudIdentityPort;
  const activeCloudFriendRequestPort = cloudFriendRequestPort ?? defaultCloudFriendRequestPort;
  const activeSocialFriendsGateway = socialFriendsGateway ?? defaultSocialFriendsGateway;
  const activeCloudFriendshipPort = cloudFriendshipPort ?? activeSocialFriendsGateway?.friendshipPort;
  const activeCloudFriendPermissionPort = cloudFriendPermissionPort ?? activeSocialFriendsGateway?.permissionPort;
  const activeActivityFeedCloudGateway = activityFeedCloudGateway ?? defaultActivityFeedCloudGateway;
  const activeActivityFeedCloudCredentials = activityFeedCloudCredentials ?? readRuntimeSocialActivityFeedCredentials;
  const activePrivacyReconciliation = privacyReconciliation
    ?? (import.meta.env.MODE === 'test' || initialSnapshot || repository
      ? undefined
      : reconcileRuntimeSocialActivityPrivacy);
  const activeIdentityReconciliation = useMemo(() => {
    if (identityReconciliation) return identityReconciliation;
    if (
      import.meta.env.MODE === 'test'
      || initialIdentity
      || identityRepository
      || !activeIdentityRepository
    ) {
      return undefined;
    }

    return (currentIdentity: SocialIdentity) => reconcileRuntimeSocialIdentity({
      identity: currentIdentity,
      repository: activeIdentityRepository,
    });
  }, [
    identityReconciliation,
    initialIdentity,
    identityRepository,
    activeIdentityRepository,
  ]);
  const initialSnapshotState = useMemo(
    () => initialSnapshot ?? createEmptyFriendsPrivacySnapshot(),
    [initialSnapshot],
  );
  const initialIdentityState = useMemo(
    () => initialIdentity ?? createDefaultSocialIdentity(),
    [initialIdentity],
  );
  const [snapshot, setSnapshot] = useState<FriendsPrivacyServiceState>(() =>
    initialSnapshotState,
  );
  const [identity, setIdentity] = useState<SocialIdentity>(() =>
    initialIdentityState,
  );
  const [handle, setHandle] = useState('');
  const [identityHandle, setIdentityHandle] = useState(() => formatSocialHandle(identity.handle));
  const [displayName, setDisplayName] = useState(identity.displayName);
  const [availability, setAvailability] = useState<SocialIdentityAvailabilityResult>(initialAvailability);
  const [identityFeedback, setIdentityFeedback] = useState<string>();
  const [requestFeedback, setRequestFeedback] = useState<string>();
  const [isCheckingAvailability, setIsCheckingAvailability] = useState(false);
  const [isSendingRequest, setIsSendingRequest] = useState(false);
  const [isLoading, setIsLoading] = useState(() => Boolean(
    (activeRepository && !initialSnapshot) || (activeIdentityRepository && !initialIdentity),
  ));
  const [errorMessage, setErrorMessage] = useState<string>();
  const [pendingFriendRemoval, setPendingFriendRemoval] = useState<FriendProfileSummary>();
  const [isRemovingFriend, setIsRemovingFriend] = useState(false);
  const persistenceQueueRef = useRef<Promise<void>>(Promise.resolve());
  const persistenceSequenceRef = useRef(0);
  const permissionMutationVersionsRef = useRef(new Map<string, number>());

  useEffect(() => {
    const shouldLoadSnapshot = Boolean(activeRepository && !initialSnapshot);
    const shouldLoadIdentity = Boolean(activeIdentityRepository && !initialIdentity);
    if (!shouldLoadSnapshot && !shouldLoadIdentity) return undefined;

    let active = true;
    setIsLoading(true);
    setErrorMessage(undefined);

    void Promise.all([
      shouldLoadSnapshot && activeRepository
        ? loadFriendsPrivacySnapshot(activeRepository)
        : Promise.resolve(initialSnapshotState),
      shouldLoadIdentity && activeIdentityRepository
        ? loadSocialIdentity(activeIdentityRepository)
        : Promise.resolve(initialIdentityState),
    ])
      .then(async ([loadedSnapshot, loadedIdentity]) => {
        if (!active) return;

        const identityReconciliationResult = activeIdentityReconciliation
          ? await activeIdentityReconciliation(loadedIdentity)
          : undefined;
        const effectiveIdentity = identityReconciliationResult?.identity ?? loadedIdentity;
        if (
          identityReconciliationResult
          && ['reconciled', 'conflict', 'unavailable'].includes(
            identityReconciliationResult.status,
          )
        ) {
          setIdentityFeedback(identityReconciliationResult.message);
        }

        let nextSnapshot = loadedSnapshot;
        let cloudSocialSnapshotSynchronized = false;
        let cloudSocialBackendUnavailable = false;

        if (activeCloudFriendRequestPort) {
          if (supportsProfiledSocialFriendRequestsPort(activeCloudFriendRequestPort)) {
            try {
              const [incomingResult, outgoingResult] = await Promise.all([
                activeCloudFriendRequestPort.listIncomingRequestsWithProfiles(effectiveIdentity.userId),
                activeCloudFriendRequestPort.listOutgoingRequestsWithProfiles(effectiveIdentity.userId),
              ]);
              const profileByUserId = new Map(
                [...incomingResult.profiles, ...outgoingResult.profiles]
                  .map((profile) => [profile.userId, profile] as const),
              );
              const localRequests = [...incomingResult.requests, ...outgoingResult.requests].flatMap((request) => {
                const report = normalizeCloudFriendRequestForUser(request, effectiveIdentity.userId);
                return report
                  ? [cloudFriendRequestToLocalRequest(report, profileByUserId.get(report.counterpartUserId))]
                  : [];
              });
              nextSnapshot = synchronizeCloudFriendRequestsIntoSnapshot(nextSnapshot, localRequests);
              cloudSocialSnapshotSynchronized = true;
            } catch {
              cloudSocialBackendUnavailable = true;
            }
          } else {
            try {
              const [incomingCloudRequests, outgoingCloudRequests] = await Promise.all([
                activeCloudFriendRequestPort.listIncomingRequests(effectiveIdentity.userId),
                activeCloudFriendRequestPort.listOutgoingRequests(effectiveIdentity.userId),
              ]);
              const localRequests = [...incomingCloudRequests, ...outgoingCloudRequests].flatMap((request) => {
                const report = normalizeCloudFriendRequestForUser(request, effectiveIdentity.userId);
                return report ? [cloudFriendRequestToLocalRequest(report)] : [];
              });
              nextSnapshot = mergeCloudFriendRequestsIntoSnapshot(nextSnapshot, localRequests);
              cloudSocialSnapshotSynchronized = true;
            } catch {
              cloudSocialBackendUnavailable = true;
            }
          }
        }

        if (activeSocialFriendsGateway) {
          const friendshipSync = await activeSocialFriendsGateway.listFriendshipsWithProfiles(effectiveIdentity.userId);
          if (friendshipSync.status !== 'unavailable') {
            nextSnapshot = synchronizeCloudFriendshipsIntoSnapshot(
              nextSnapshot,
              effectiveIdentity.userId,
              friendshipSync.friendships,
              friendshipSync.profiles,
            );
            cloudSocialSnapshotSynchronized = true;
          } else {
            cloudSocialBackendUnavailable = true;
          }
        } else if (activeCloudFriendshipPort) {
          try {
            const friendships = await activeCloudFriendshipPort.listFriendships(effectiveIdentity.userId);
            nextSnapshot = mergeCloudFriendshipsIntoSnapshot(nextSnapshot, effectiveIdentity.userId, friendships, []);
            cloudSocialSnapshotSynchronized = true;
          } catch {
            cloudSocialBackendUnavailable = true;
          }
        }

        if (activeSocialFriendsGateway?.listPermissionsWithStatus) {
          const permissionSync = await activeSocialFriendsGateway.listPermissionsWithStatus(effectiveIdentity.userId);
          if (permissionSync.status === 'synchronized') {
            nextSnapshot = ensureFriendActivityPermissions({
              ...nextSnapshot,
              activityPermissions: permissionSync.permissions,
            });
            cloudSocialSnapshotSynchronized = true;
          } else {
            cloudSocialBackendUnavailable = true;
          }
        } else if (activeCloudFriendPermissionPort) {
          try {
            const permissions = await activeCloudFriendPermissionPort.listPermissions(effectiveIdentity.userId);
            nextSnapshot = ensureFriendActivityPermissions({
              ...nextSnapshot,
              activityPermissions: permissions,
            });
            cloudSocialSnapshotSynchronized = true;
          } catch {
            cloudSocialBackendUnavailable = true;
          }
        }

        if (!active) return;

        if (activeRepository && cloudSocialSnapshotSynchronized) {
          await persistFriendsPrivacySnapshot(activeRepository, nextSnapshot);
        }

        if (!active) return;
        setSnapshot(nextSnapshot);
        setIdentity(effectiveIdentity);
        setIdentityHandle(formatSocialHandle(effectiveIdentity.handle));
        setDisplayName(effectiveIdentity.displayName);
        if (cloudSocialBackendUnavailable) {
          setRequestFeedback('Connexion sociale indisponible : les données locales ont été conservées.');
        }

        if (cloudSocialSnapshotSynchronized && activePrivacyReconciliation) {
          void activePrivacyReconciliation().catch(() => undefined);
        }
      })
      .catch((error) => {
        if (!active) return;
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Les données amis n’ont pas pu être chargées.',
        );
      })
      .finally(() => {
        if (active) setIsLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    activeRepository,
    activeIdentityRepository,
    initialSnapshot,
    initialIdentity,
    initialSnapshotState,
    initialIdentityState,
    activeCloudFriendRequestPort,
    activeSocialFriendsGateway,
    activeCloudFriendshipPort,
    activeCloudFriendPermissionPort,
    activePrivacyReconciliation,
    activeIdentityReconciliation,
  ]);

  useEffect(() => {
    if (!activeRepository || typeof window === 'undefined') return undefined;

    let active = true;
    const refreshPrivacyFromCloud = () => {
      void loadFriendsPrivacySnapshot(activeRepository)
        .then((loadedSnapshot) => {
          if (!active) return;
          setSnapshot(loadedSnapshot);
          setErrorMessage(undefined);
        })
        .catch((error) => {
          if (!active) return;
          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Les préférences sociales synchronisées n’ont pas pu être relues.',
          );
        });
    };

    window.addEventListener(
      SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT,
      refreshPrivacyFromCloud,
    );
    return () => {
      active = false;
      window.removeEventListener(
        SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT,
        refreshPrivacyFromCloud,
      );
    };
  }, [activeRepository]);

  const summary = useMemo(() => summarizeFriendsPrivacy(snapshot), [snapshot]);
  const handleValidation = useMemo(() => validateSocialHandle(identityHandle), [identityHandle]);
  const socialActivityFeed = useMemo(
    () => prepareSocialActivityFeed({
      privacySnapshot: snapshot,
      snapshots: initialActivitySnapshots ?? [],
    }),
    [snapshot, initialActivitySnapshots],
  );
  const shouldUseCloudActivityFeed = Boolean(activeActivityFeedCloudGateway);
  const incomingRequests = snapshot.requests.filter((request) => request.direction === 'incoming');
  const outgoingRequests = snapshot.requests.filter((request) => request.direction === 'outgoing');

  const persistSnapshot = async (next: FriendsPrivacyServiceState): Promise<boolean> => {
    const persistenceSequence = persistenceSequenceRef.current + 1;
    persistenceSequenceRef.current = persistenceSequence;
    setSnapshot(next);
    setErrorMessage(undefined);

    if (!activeRepository) return true;

    const persistence = persistenceQueueRef.current
      .catch(() => undefined)
      .then(() => persistFriendsPrivacySnapshot(activeRepository, next));
    persistenceQueueRef.current = persistence.then(() => undefined, () => undefined);

    try {
      await persistence;
      return true;
    } catch (error) {
      if (persistenceSequence === persistenceSequenceRef.current) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Les changements amis n’ont pas pu être enregistrés.',
        );
      }
      return false;
    }
  };

  const update = (
    action: (actions: FriendsPrivacyServiceActions) => FriendsPrivacyServiceState,
  ) => {
    const service = createFriendsPrivacyService(snapshot);
    void persistSnapshot(action(service.actions));
  };

  const reconcilePrivacy = (persistence: Promise<boolean> = Promise.resolve(true)) => {
    if (!activePrivacyReconciliation) return;
    void persistence.then((persisted) => {
      if (!persisted) return;
      return activePrivacyReconciliation()
        .then(() => {
          setSnapshot((current) => ({
            ...current,
            lastFeedback: 'Réglages enregistrés et snapshots sociaux remis en cohérence.',
          }));
        })
        .catch(() => {
          setSnapshot((current) => ({
            ...current,
            lastFeedback: 'Réglages enregistrés. La remise en cohérence sociale reprendra automatiquement.',
          }));
        });
    });
  };

  const persistSocialPrivacyForAccountSync = (
    next: FriendsPrivacyServiceState,
    reason: string,
  ): Promise<boolean> => persistSnapshot(next).then((persisted) => {
    if (persisted) {
      notifySyncLocalDataChanged(['account-preferences'], reason);
    }
    return persisted;
  });


  const updateProfileVisibility = (visibility: FriendVisibilityLevel) => {
    const service = createFriendsPrivacyService(snapshot);
    void persistSocialPrivacyForAccountSync(
      service.actions.setProfileVisibility(visibility),
      'social-profile-visibility-update',
    );
  };

  const normalizeHandleForMatch = (value: string): string => value
    .trim()
    .replace(/^@/u, '')
    .toLowerCase()
    .replace(/[^a-z0-9._-]/gu, '')
    .slice(0, 32);

  const resolveCloudFriendUserId = async (
    friend: FriendProfileSummary,
    permission: ReturnType<typeof selectFriendActivityPermission>,
  ): Promise<EntityId | undefined> => {
    const directUserId = permission.friendUserId
      ?? friend.userId
      ?? (String(friend.id).startsWith('social-user:') ? friend.id : undefined);

    if (directUserId) return directUserId as EntityId;
    if (!activeSocialFriendsGateway) return undefined;

    const { friendships, profiles } = await activeSocialFriendsGateway.listFriendshipsWithProfiles(identity.userId);
    const targetHandle = normalizeHandleForMatch(permission.friendHandle || friend.handle);
    const profileMatch = profiles.find((profile) => normalizeHandleForMatch(profile.handle) === targetHandle);
    if (profileMatch) return profileMatch.userId as EntityId;

    const counterpartIds = friendships.flatMap((friendship) => {
      const counterpartId = getCloudFriendshipCounterpartUserId(friendship, identity.userId);
      return counterpartId ? [counterpartId] : [];
    });

    return counterpartIds.length === 1 ? counterpartIds[0] : undefined;
  };

  const synchronizeFriendPermission = (
    friend: FriendProfileSummary,
    next: FriendsPrivacyServiceState,
    permission: ReturnType<typeof selectFriendActivityPermission>,
    localFeedback: string,
  ) => {
    const previousSnapshot = snapshot;
    const mutationKey = String(friend.userId ?? friend.id);
    const mutationVersion = (permissionMutationVersionsRef.current.get(mutationKey) ?? 0) + 1;
    permissionMutationVersionsRef.current.set(mutationKey, mutationVersion);
    const isCurrentMutation = () => (
      permissionMutationVersionsRef.current.get(mutationKey) === mutationVersion
    );
    const restorePreviousSnapshot = () => {
      if (!isCurrentMutation()) return;
      void persistSnapshot(previousSnapshot);
    };
    const optimisticPersistence = persistSnapshot(next);

    if (!activeCloudFriendPermissionPort) {
      reconcilePrivacy(optimisticPersistence);
      if (isCurrentMutation()) setRequestFeedback(localFeedback);
      return;
    }

    setRequestFeedback('Synchronisation de la permission ami serveur en cours…');

    void optimisticPersistence
      .then((persisted) => {
        if (!persisted || !isCurrentMutation()) return undefined;
        return resolveCloudFriendUserId(friend, permission);
      })
      .then((friendUserId) => {
        if (!isCurrentMutation()) return undefined;
        if (!friendUserId) {
          restorePreviousSnapshot();
          setRequestFeedback('Permission ami serveur impossible : userId ami introuvable dans les amitiés actives.');
          return undefined;
        }

        const cloudPermission = {
          ...permission,
          id: `cloud-friend-permission:${identity.userId}->${friendUserId}` as EntityId,
          friendUserId,
          friendHandle: permission.friendHandle || friend.handle,
        };

        return activeCloudFriendPermissionPort.savePermission(identity.userId, cloudPermission);
      })
      .then((result) => {
        if (!result || !isCurrentMutation()) return;
        if (['created', 'updated', 'alreadyExists'].includes(result.status)) {
          const confirmedPermission = result.value;
          if (!confirmedPermission) {
            restorePreviousSnapshot();
            setRequestFeedback(result.message);
            return;
          }
          const mergedPermissions = [
            ...(next.activityPermissions ?? []).filter((candidate) => (
              candidate.id !== confirmedPermission.id
              && candidate.friendUserId !== confirmedPermission.friendUserId
              && candidate.friendHandle !== confirmedPermission.friendHandle
            )),
            confirmedPermission,
          ];
          const confirmedSnapshot = {
            ...ensureFriendActivityPermissions({
              ...next,
              activityPermissions: mergedPermissions,
            }),
            lastFeedback: result.message,
          };
          reconcilePrivacy(persistSnapshot(confirmedSnapshot));
          setRequestFeedback(result.message);
          return;
        }

        restorePreviousSnapshot();
        setRequestFeedback(result.message);
      })
      .catch((error) => {
        if (!isCurrentMutation()) return;
        restorePreviousSnapshot();
        setRequestFeedback(
          error instanceof Error
            ? error.message
            : 'Service cloud indisponible : permission ami impossible à synchroniser.',
        );
      });
  };

  const updateFriendPermission = (friend: FriendProfileSummary, sharing: FriendActivityPermissionLevel) => {
    setRequestFeedback(undefined);
    setErrorMessage(undefined);

    const service = createFriendsPrivacyService(snapshot);
    const next = service.actions.setFriendActivityPermission(friend.id, sharing);
    const permission = selectFriendActivityPermission(next, friend);
    synchronizeFriendPermission(
      friend,
      next,
      permission,
      sharing === 'detailed'
        ? 'Partage personnalisé enregistré pour cet ami.'
        : sharing === 'summary'
          ? 'Partage limité au résumé pour cet ami.'
          : 'Partage d’activité désactivé pour cet ami.',
    );
  };

  const updateFriendFieldSelection = (
    friend: FriendProfileSummary,
    fieldSelection: SocialActivityFieldSelection,
  ) => {
    setRequestFeedback(undefined);
    setErrorMessage(undefined);

    const service = createFriendsPrivacyService(snapshot);
    const next = service.actions.setFriendActivityFieldSelection(friend.id, fieldSelection);
    const permission = selectFriendActivityPermission(next, friend);
    synchronizeFriendPermission(
      friend,
      next,
      permission,
      'Champs partagés avec cet ami enregistrés localement.',
    );
  };

  const removeFriend = async (friend: FriendProfileSummary) => {
    setRequestFeedback(undefined);
    setErrorMessage(undefined);
    setIsRemovingFriend(true);

    const applyLocalRemoval = (feedback: string) => {
      const service = createFriendsPrivacyService(snapshot);
      const next = service.actions.removeFriend(friend.id);
      reconcilePrivacy(persistSnapshot({ ...next, lastFeedback: feedback }));
      setRequestFeedback(feedback);
    };

    try {
      const removeFriendshipFromServer = activeSocialFriendsGateway?.removeFriendship;
      if (!removeFriendshipFromServer) {
        applyLocalRemoval('Ami supprimé localement. La suppression serveur sera possible une fois le cloud social disponible.');
        return;
      }

      setRequestFeedback('Suppression de l’ami côté serveur en cours…');
      const permission = selectFriendActivityPermission(snapshot, friend);
      const friendUserId = await resolveCloudFriendUserId(friend, permission);

      if (!friendUserId) {
        setRequestFeedback('Suppression serveur impossible : userId ami introuvable dans les amitiés actives.');
        return;
      }

      const result = await removeFriendshipFromServer(identity.userId, friendUserId);
      if (['updated', 'alreadyExists'].includes(result.status)) {
        applyLocalRemoval(result.message);
        return;
      }

      setRequestFeedback(result.message);
    } catch (error) {
      setRequestFeedback(
        error instanceof Error
          ? error.message
          : 'Service cloud indisponible : suppression ami impossible pour le moment.',
      );
    } finally {
      setIsRemovingFriend(false);
      setPendingFriendRemoval(undefined);
    }
  };

  const submitRequest = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setRequestFeedback(undefined);
    setErrorMessage(undefined);
    setIsSendingRequest(true);

    void sendExactFriendRequest({
      snapshot,
      identity,
      handle,
      lookupGateway: activeLookupGateway,
      ...(activeCloudFriendRequestPort ? { cloudFriendRequestPort: activeCloudFriendRequestPort } : {}),
    })
      .then((result) => {
        setRequestFeedback(result.message);
        if (result.status === 'sent') {
          void persistSnapshot({ ...result.snapshot, lastFeedback: result.message });
          setHandle('');
        }
      })
      .catch((error) => {
        setRequestFeedback(
          error instanceof Error
            ? error.message
            : 'Service cloud indisponible : demande impossible pour le moment.',
        );
      })
      .finally(() => setIsSendingRequest(false));
  };

  const respondToIncomingRequest = (request: FriendRequest, status: 'accepted' | 'declined') => {
    setRequestFeedback(undefined);
    setErrorMessage(undefined);
    const respondedAt = new Date().toISOString();
    const localFeedback = status === 'accepted' ? 'Demande acceptée.' : 'Demande refusée.';
    const applyLocalChange = () => {
      const nextSnapshot = status === 'accepted'
        ? acceptFriendRequest(snapshot, request.id, respondedAt)
        : declineFriendRequest(snapshot, request.id);
      void persistSnapshot({ ...nextSnapshot, lastFeedback: localFeedback });
    };

    if (!activeCloudFriendRequestPort) {
      applyLocalChange();
      return;
    }

    void activeCloudFriendRequestPort.updateRequestStatus(request.id, status, respondedAt)
      .then((result) => {
        if (['updated', 'created', 'alreadyExists'].includes(result.status)) {
          applyLocalChange();
          setRequestFeedback(result.message);
          return;
        }

        setRequestFeedback(result.message);
      })
      .catch((error) => {
        setRequestFeedback(
          error instanceof Error
            ? error.message
            : 'Service cloud indisponible : réponse à la demande impossible pour le moment.',
        );
      });
  };

  const submitIdentity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(undefined);
    setIdentityFeedback(undefined);

    const accountUserId = currentAccountUserId();

    const saveOperation = accountUserId && activeCloudIdentityPort && activeIdentityRepository
      ? provisionAccountSocialIdentity({
          accountUserId,
          currentIdentity: identity,
          handle: identityHandle,
          displayName,
          repository: activeIdentityRepository,
          cloudPort: activeCloudIdentityPort,
        })
      : saveSocialIdentity(activeIdentityRepository, identity, {
          handle: identityHandle,
          displayName,
        });

    void saveOperation
      .then(async (result) => {
        if (result.status !== 'saved') {
          setIdentityFeedback(result.message);
          return;
        }

        setIdentity(result.identity);
        setIdentityHandle(formatSocialHandle(result.identity.handle));
        setDisplayName(result.identity.displayName);

        if (accountUserId && activeCloudIdentityPort) {
          setIdentityFeedback(result.message);
          return;
        }

        if (!activeCloudIdentityPort) {
          setIdentityFeedback(result.message);
          return;
        }

        const cloudResult = await activeCloudIdentityPort.publishIdentity(result.identity);
        if (['created', 'updated', 'alreadyExists'].includes(cloudResult.status)) {
          setIdentityFeedback(`${result.message} ${cloudResult.message}`);
          return;
        }

        setIdentityFeedback(`${result.message} Publication cloud non effectuée : ${cloudResult.message}`);
      })
      .catch((error) => {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'L’identité sociale n’a pas pu être enregistrée.',
        );
      });
  };

  const verifyAvailability = () => {
    setIsCheckingAvailability(true);
    setIdentityFeedback(undefined);

    const accountUserId = currentAccountUserId();
    const availabilityOperation = accountUserId && activeCloudIdentityPort
      ? checkAccountSocialHandleAvailability(
          activeCloudIdentityPort,
          identityHandle,
          accountUserId,
        )
      : checkSocialHandleAvailability(activeLookupGateway, identityHandle);

    void availabilityOperation
      .then((result) => {
        setAvailability(result);
      })
      .catch((error) => {
        setAvailability({
          status: 'unavailable',
          message: error instanceof Error
            ? error.message
            : 'Compte cloud indisponible : disponibilité réelle impossible pour le moment.',
        });
      })
      .finally(() => setIsCheckingAvailability(false));
  };

  const copyIdentity = () => {
    const publicHandle = formatSocialHandle(identity.handle);
    if (!navigator.clipboard?.writeText) {
      setIdentityFeedback(`Identifiant à copier : ${publicHandle}`);
      return;
    }

    void navigator.clipboard.writeText(publicHandle)
      .then(() => setIdentityFeedback('Identifiant copié.'))
      .catch(() => setIdentityFeedback(`Identifiant à copier : ${publicHandle}`));
  };

  return (
    <section aria-labelledby="friends-title" className="min-w-0 space-y-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Réseau privé
            </p>
            <h1
              id="friends-title"
              className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
            >
              Amis et confidentialité
            </h1>
            <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
              Prépare ton identité publique, les invitations exactes et les limites de visibilité avant tout partage de performances.
            </p>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50 px-4 py-3 text-sm font-semibold text-brand-900 dark:border-brand-900 dark:bg-brand-950/40 dark:text-brand-100">
            {summary.friendCount} ami{summary.friendCount > 1 ? 's' : ''} · {summary.incomingPendingCount} demande{summary.incomingPendingCount > 1 ? 's' : ''} à valider · {summary.detailedPermissionCount} détail autorisé
          </div>
        </div>
      </div>

      <InlineNotice title="Partage défini par ami">
        <p>
          Chaque nouvel ami voit un résumé par défaut. Utilise « Gérer » sur sa carte pour choisir Aucun, Résumé ou Personnalisé. Rien n’est à régler lors de l’enregistrement d’une activité.
        </p>
      </InlineNotice>

      <InlineNotice title="Fil d’activité sécurisé 0.29">
        <p>
          Le fil charge uniquement des snapshots filtrés. Les cartes ne contiennent jamais l’activité métier brute et le détail est revérifié par le serveur à chaque ouverture.
        </p>
        <p>
          Likes, commentaires, messagerie, défis et partage public restent hors périmètre. L’activation entre vrais comptes nécessite la migration D1 et le déploiement de la version 0.29.0.
        </p>
      </InlineNotice>

      {isLoading ? (
        <InlineNotice title="Chargement local">
          <p className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Chargement des amis et de l’identité sociale enregistrés sur cet appareil.
          </p>
        </InlineNotice>
      ) : null}

      {errorMessage ? (
        <InlineNotice tone="error" title="Persistance locale indisponible">
          <p>{errorMessage}</p>
        </InlineNotice>
      ) : null}

      {snapshot.lastFeedback ? (
        <InlineNotice tone="success" title="Action prise en compte">
          <p>{snapshot.lastFeedback}</p>
        </InlineNotice>
      ) : null}

      {identityFeedback ? (
        <InlineNotice tone="success" title="Identité sociale">
          <p>{identityFeedback}</p>
        </InlineNotice>
      ) : null}

      {requestFeedback ? (
        <InlineNotice title="Recherche ami">
          <p>{requestFeedback}</p>
        </InlineNotice>
      ) : null}

      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Mon identifiant SportPilot
            </p>
            <h2 className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {formatSocialHandle(identity.handle)}
            </h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Le userId interne reste privé et stable. Les futures relations d’amitié seront rattachées au userId, pas au handle public.
            </p>
          </div>
          <Button type="button" variant="secondary" onClick={copyIdentity}>
            Copier mon identifiant
          </Button>
        </div>

        <form className="mt-5 grid gap-4 lg:grid-cols-[1fr_1fr_auto] lg:items-end" onSubmit={submitIdentity}>
          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="social-handle">
              Identifiant public
            </label>
            <input
              id="social-handle"
              value={identityHandle}
              onChange={(event) => {
                setIdentityHandle(event.target.value);
                setAvailability(initialAvailability);
              }}
              placeholder="ex. @alex.run"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="social-display-name">
              Nom affiché
            </label>
            <input
              id="social-display-name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="ex. Alex Run"
              className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            />
          </div>

          <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
            <Button type="button" variant="secondary" onClick={verifyAvailability} disabled={isCheckingAvailability}>
              {isCheckingAvailability ? 'Vérification…' : 'Vérifier disponibilité'}
            </Button>
            <Button type="submit">
              Enregistrer
            </Button>
          </div>
        </form>

        <div className="mt-4 grid gap-3 lg:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <p className="font-semibold text-slate-950 dark:text-white">
              {handleValidation.status === 'valid' ? 'Identifiant valide' : 'Identifiant invalide'}
            </p>
            <p>{handleValidation.message}</p>
          </div>
          <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700 dark:border-slate-800 dark:text-slate-200">
            <p className="font-semibold text-slate-950 dark:text-white">
              Recherche exacte
            </p>
            <p>{availability.message}</p>
          </div>
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            {activeDataSpace.kind === 'account'
              ? 'Compte connecté : toute modification du pseudonyme doit être réservée côté serveur avant d’être enregistrée localement.'
              : 'Mode local : cette identité reste sur cet appareil et son unicité cloud n’est pas garantie tant qu’aucun compte n’est connecté.'}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-brand-100 p-3 text-brand-700 dark:bg-brand-950 dark:text-brand-200">
              <ShieldCheck aria-hidden="true" className="size-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">
                Confidentialité
              </h2>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                La visibilité du profil et le partage des activités sont réglés séparément.
              </p>
            </div>
          </div>

          <div className="mt-5 space-y-5">
            <div>
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Visibilité du profil
              </p>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">
                {visibilityOptions.map((option) => (
                  <Button
                    key={option}
                    variant={snapshot.privacy.profileVisibility === option ? 'primary' : 'secondary'}
                    onClick={() => updateProfileVisibility(option)}
                    aria-pressed={snapshot.privacy.profileVisibility === option}
                  >
                    {FRIEND_PROFILE_VISIBILITY_LABELS[option]}
                  </Button>
                ))}
              </div>
            </div>

            <p className="rounded-xl bg-slate-50 px-3 py-2 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
              La visibilité du profil concerne uniquement ton profil social. Le partage des activités se règle séparément pour chaque ami.
            </p>

            <div className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold text-slate-950 dark:text-white">
                    Demandes d’amis
                  </p>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {snapshot.privacy.allowFriendRequests
                      ? 'Les invitations entrantes sont autorisées.'
                      : 'Les nouvelles invitations sont bloquées.'}
                  </p>
                </div>
                <Button
                  variant={snapshot.privacy.allowFriendRequests ? 'primary' : 'secondary'}
                  onClick={() => update((actions) => actions.setRequestsOpen(!snapshot.privacy.allowFriendRequests))}
                >
                  {snapshot.privacy.allowFriendRequests ? 'Ouvertes' : 'Bloquées'}
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <UserPlus aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Envoyer une invitation
            </h2>
          </div>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            La demande passe par une recherche exacte d’identifiant SportPilot. En F6, la recherche exacte et les demandes cloud restent protégées : aucune amitié n’est créée sans acceptation explicite.
          </p>

          <form className="mt-5 space-y-3" onSubmit={submitRequest}>
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-200" htmlFor="friend-handle">
              Identifiant SportPilot
            </label>
            <div className="flex flex-col gap-2 sm:flex-row">
              <input
                id="friend-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="ex. @lea.cardio"
                className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none transition focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <Button type="submit" disabled={isSendingRequest}>
                <Send aria-hidden="true" className="size-4" />
                {isSendingRequest ? 'Recherche…' : 'Envoyer'}
              </Button>
            </div>
          </form>

          <div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
            Aucune performance détaillée n’est partagée depuis ce formulaire. Il prépare seulement la demande d’ami et le consentement futur.
          </div>
        </Card>
      </div>

      {shouldUseCloudActivityFeed && activeActivityFeedCloudGateway ? (
        <>
          <SocialActivityCloudReadinessPanel
            gateway={activeActivityFeedCloudGateway}
            getCredentials={activeActivityFeedCloudCredentials}
            {...(activityFeedOnline ? { isOnline: activityFeedOnline } : {})}
            subscribeCredentials={activityFeedCloudSubscription ?? subscribeRuntimeSocialActivityFeed}
          />
          <SocialActivityFeedPanel
            gateway={activeActivityFeedCloudGateway}
            getCredentials={activeActivityFeedCloudCredentials}
            {...(activityFeedOnline ? { isOnline: activityFeedOnline } : {})}
            subscribeCredentials={activityFeedCloudSubscription ?? subscribeRuntimeSocialActivityFeed}
          />
        </>
      ) : (
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Snapshots filtrés uniquement
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Fil d’activité amis
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {socialActivityFeed.message}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
            {socialActivityFeed.items.length} activité{socialActivityFeed.items.length > 1 ? 's' : ''} affichée{socialActivityFeed.items.length > 1 ? 's' : ''}
          </div>
        </div>

        {socialActivityFeed.items.length === 0 ? (
          <p className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
            {socialActivityFeed.message}
          </p>
        ) : (
          <div className="mt-4 space-y-3">
            {socialActivityFeed.items.map((item) => (
              <article
                key={item.id}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                      {item.friendInitials}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-950 dark:text-white">{item.friendDisplayName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">@{item.friendHandle}</p>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {item.scope === 'detailed' ? 'Détail autorisé' : 'Résumé'} · {item.activityLabel}
                      </p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                    {item.date} · {item.durationMinutes} min · {item.estimatedCaloriesKcal} kcal
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2 text-sm">
                  <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    Intensité {item.intensityLabel}
                  </span>
                  {item.metricLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {label}
                    </span>
                  ))}
                  {item.detailLabels.map((label) => (
                    <span
                      key={label}
                      className="rounded-full bg-brand-100 px-3 py-1 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-100"
                    >
                      {label}
                    </span>
                  ))}
                </div>

                {item.permissionLimited ? (
                  <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm leading-6 text-amber-950 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-100">
                    Détail limité par permission actuelle : affichage résumé uniquement.
                  </p>
                ) : null}

                <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Aucun champ brut d’activité n’est affiché.
                </p>
              </article>
            ))}
          </div>
        )}
      </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <UsersRound aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Amis connectés
            </h2>
          </div>
          <div className="mt-4 space-y-3">
            {snapshot.friends.length === 0 ? (
              <p className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                Aucun ami enregistré sur cet appareil pour le moment.
              </p>
            ) : snapshot.friends.map((friend) => {
              const friendSharingGuard = evaluateFriendScopedActivitySharingGuard(snapshot, friend);

              return (
                <div
                  key={friend.id}
                  className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex size-11 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                        {friend.initials}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950 dark:text-white">{friend.displayName}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">@{friend.handle}</p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => setPendingFriendRemoval(friend)}
                    >
                      <X aria-hidden="true" className="size-4" />
                      Supprimer
                    </Button>
                  </div>
                  <div className="mt-3">
                    <SocialActivityFriendSharingSettings
                      friendDisplayName={friend.displayName}
                      sharingLevel={friendSharingGuard.permission.sharingLevel}
                      value={friendSharingGuard.permission.fieldSelection ?? DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION}
                      onSharingLevelChange={(sharingLevel) => updateFriendPermission(friend, sharingLevel)}
                      onSaveFields={(fieldSelection) => updateFriendFieldSelection(friend, fieldSelection)}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <LockKeyhole aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Demandes
            </h2>
          </div>

          <div className="mt-4 space-y-3">
            {[...incomingRequests, ...outgoingRequests].length === 0 ? (
              <p className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
                Aucune demande locale enregistrée.
              </p>
            ) : [...incomingRequests, ...outgoingRequests].map((request) => (
              <div
                key={request.id}
                className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{request.displayName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      @{request.handle} · {formatRequestDate(request.requestedAt)} · {requestStatusLabel(request)}
                    </p>
                  </div>
                  {request.direction === 'incoming' && request.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondToIncomingRequest(request, 'accepted')}>
                        <Check aria-hidden="true" className="size-4" />
                        Accepter
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => respondToIncomingRequest(request, 'declined')}>
                        <X aria-hidden="true" className="size-4" />
                        Refuser
                      </Button>
                    </div>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <ConfirmationDialog
        open={Boolean(pendingFriendRemoval)}
        title={pendingFriendRemoval ? `Supprimer ${pendingFriendRemoval.displayName} ?` : 'Supprimer cet ami ?'}
        description="Vous ne pourrez plus voir vos activités respectives. Une nouvelle demande sera nécessaire pour redevenir amis."
        confirmLabel="Supprimer l’ami"
        tone="danger"
        isPending={isRemovingFriend}
        onCancel={() => setPendingFriendRemoval(undefined)}
        onConfirm={() => {
          if (pendingFriendRemoval) void removeFriend(pendingFriendRemoval);
        }}
      />
    </section>
  );
}
