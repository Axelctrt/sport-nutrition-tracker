import {
  Check,
  LoaderCircle,
  Send,
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
import { FriendsSectionNavigation } from '@/app/friends/FriendsSectionNavigation';
import { SocialActivityFeedPanel } from '@/features/friends/components/SocialActivityFeedPanel';
import { SocialActivityFriendSharingSettings } from '@/features/friends/components/SocialActivitySharingSettings';
import { useFriendsSection } from '@/features/friends/hooks/useFriendsSection';
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
import { BottomSheet } from '@/shared/ui/BottomSheet';
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
  const [managedFriend, setManagedFriend] = useState<FriendProfileSummary>();
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
  const pendingIncomingRequestCount = incomingRequests.filter((request) => request.status === 'pending').length;
  const { section, selectSection } = useFriendsSection();

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

  const selectedFriend = managedFriend
    ? snapshot.friends.find((friend) => friend.id === managedFriend.id) ?? managedFriend
    : undefined;
  const selectedFriendSharing = selectedFriend
    ? evaluateFriendScopedActivitySharingGuard(snapshot, selectedFriend)
    : undefined;

  return (
    <section aria-labelledby="friends-title" className="min-w-0 space-y-4">
      <header className="px-1">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Communauté
        </p>
        <div className="mt-1 flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 id="friends-title" className="text-3xl font-bold text-slate-950 dark:text-white">
              Amis
            </h1>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Suis les activités de tes proches et choisis ce que chacun peut voir.
            </p>
          </div>
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {summary.friendCount} ami{summary.friendCount > 1 ? 's' : ''}
          </p>
        </div>
      </header>

      <FriendsSectionNavigation
        activeSection={section}
        incomingRequestCount={pendingIncomingRequestCount}
        onSelect={selectSection}
      />

      {isLoading ? (
        <InlineNotice title="Chargement">
          <p className="inline-flex items-center gap-2">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Tes amis sont en cours de chargement.
          </p>
        </InlineNotice>
      ) : null}
      {errorMessage ? (
        <InlineNotice tone="error" title="Chargement impossible">{errorMessage}</InlineNotice>
      ) : null}
      {snapshot.lastFeedback ? (
        <InlineNotice tone="success" title="Action prise en compte">{snapshot.lastFeedback}</InlineNotice>
      ) : null}
      {identityFeedback && section === 'profile' ? (
        <InlineNotice tone="success" title="Profil">{identityFeedback}</InlineNotice>
      ) : null}
      {requestFeedback && section === 'requests' ? (
        <InlineNotice title="Demande d’ami">{requestFeedback}</InlineNotice>
      ) : null}

      <div
        id="friends-panel-feed"
        role="tabpanel"
        aria-labelledby="friends-title"
        className="space-y-4"
        hidden={section !== 'feed'}
      >
          {snapshot.friends.length === 0 ? (
            <Card className="p-6 text-center sm:p-8">
              <UsersRound aria-hidden="true" className="mx-auto size-8 text-brand-700 dark:text-brand-300" />
              <h2 className="mt-3 text-xl font-bold text-slate-950 dark:text-white">Ton fil est vide</h2>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
                Ajoute un ami pour découvrir ses prochaines activités ici.
              </p>
              <Button className="mt-4" onClick={() => selectSection('requests')}>
                <UserPlus aria-hidden="true" className="size-4" />
                Ajouter un ami
              </Button>
            </Card>
          ) : shouldUseCloudActivityFeed && activeActivityFeedCloudGateway && section === 'feed' ? (
            <SocialActivityFeedPanel
              gateway={activeActivityFeedCloudGateway}
              getCredentials={activeActivityFeedCloudCredentials}
              {...(activityFeedOnline ? { isOnline: activityFeedOnline } : {})}
              subscribeCredentials={activityFeedCloudSubscription ?? subscribeRuntimeSocialActivityFeed}
            />
          ) : (
            <Card className="p-5 sm:p-6">
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Fil d’activité amis</h2>
              {socialActivityFeed.items.length === 0 ? (
                <p className="mt-3 text-sm leading-6 text-slate-600 dark:text-slate-300">
                  Aucune activité récente de tes amis.
                </p>
              ) : (
                <div className="mt-4 space-y-3">
                  {socialActivityFeed.items.map((item) => (
                    <article key={item.id} className="rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                            {item.friendInitials}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950 dark:text-white">{item.friendDisplayName}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{item.activityLabel}</p>
                          </div>
                        </div>
                        <p className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">{item.date}</p>
                      </div>
                      <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {item.durationMinutes} min · {item.estimatedCaloriesKcal} kcal
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2 text-sm">
                        <span className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {item.scope === 'detailed' ? 'Détail autorisé' : 'Résumé'} · {item.activityLabel}
                        </span>
                        {item.metricLabels.map((label) => (
                          <span key={label} className="rounded-full bg-slate-100 px-3 py-1 font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                            {label}
                          </span>
                        ))}
                        {item.detailLabels.map((label) => (
                          <span key={label} className="rounded-full bg-brand-100 px-3 py-1 font-semibold text-brand-800 dark:bg-brand-950 dark:text-brand-100">
                            {label}
                          </span>
                        ))}
                      </div>
                      {item.permissionLimited ? (
                        <p className="mt-3 text-sm text-amber-800 dark:text-amber-200">
                          Détail limité par permission actuelle.
                        </p>
                      ) : null}
                    </article>
                  ))}
                </div>
              )}
            </Card>
          )}
      </div>

      <div
        id="friends-panel-friends"
        role="tabpanel"
        aria-labelledby="friends-title"
        hidden={section !== 'friends'}
      >
          <Card className="p-5 sm:p-6">
          <h2 className="text-xl font-bold text-slate-950 dark:text-white">Mes amis</h2>
          <div className="mt-4 divide-y divide-slate-200 dark:divide-slate-800">
            {snapshot.friends.length === 0 ? (
              <div className="py-6 text-center">
                <p className="text-sm text-slate-600 dark:text-slate-300">Tu n’as pas encore ajouté d’ami.</p>
                <Button className="mt-4" onClick={() => selectSection('requests')}>Ajouter un ami</Button>
              </div>
            ) : snapshot.friends.map((friend) => {
              const sharing = evaluateFriendScopedActivitySharingGuard(snapshot, friend);
              const sharingLabel = sharing.permission.sharingLevel === 'none'
                ? 'Partage : Aucun'
                : sharing.permission.sharingLevel === 'detailed' ? 'Partage : Personnalisé' : 'Partage : Résumé';
              return (
                <div key={friend.id} className="flex items-center gap-3 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                    {friend.initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-950 dark:text-white">{friend.displayName}</p>
                    <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{friend.handle}</p>
                    <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{sharingLabel}</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => setManagedFriend(friend)}>Gérer</Button>
                </div>
              );
            })}
          </div>
          </Card>
      </div>

      <div
        id="friends-panel-requests"
        role="tabpanel"
        aria-labelledby="friends-title"
        className="space-y-4"
        hidden={section !== 'requests'}
      >
          <Card className="p-5 sm:p-6">
            <h2 className="text-xl font-bold text-slate-950 dark:text-white">
              Demandes reçues
              {pendingIncomingRequestCount > 0 ? ` (${pendingIncomingRequestCount})` : ''}
            </h2>
            <div className="mt-4 space-y-3">
              {incomingRequests.length === 0 ? (
                <p className="text-sm text-slate-600 dark:text-slate-300">Aucune demande reçue.</p>
              ) : incomingRequests.map((request) => (
                <div key={request.id} className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
                  <div>
                    <p className="font-semibold text-slate-950 dark:text-white">{request.displayName}</p>
                    <p className="text-sm text-slate-500 dark:text-slate-400">
                      @{request.handle} · {formatRequestDate(request.requestedAt)}
                    </p>
                  </div>
                  {request.status === 'pending' ? (
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => respondToIncomingRequest(request, 'accepted')}>
                        <Check aria-hidden="true" className="size-4" />Accepter
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => respondToIncomingRequest(request, 'declined')}>
                        <X aria-hidden="true" className="size-4" />Refuser
                      </Button>
                    </div>
                  ) : <span className="text-sm font-semibold text-slate-500">{requestStatusLabel(request)}</span>}
                </div>
              ))}
            </div>
          </Card>

          <Card className="p-5 sm:p-6">
            <div className="flex items-center gap-3">
              <UserPlus aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
              <h2 className="text-xl font-bold text-slate-950 dark:text-white">Ajouter un ami</h2>
            </div>
            <form className="mt-4 flex flex-col gap-2 sm:flex-row" onSubmit={submitRequest}>
              <label className="sr-only" htmlFor="friend-handle">Identifiant SportPilot</label>
              <input
                id="friend-handle"
                value={handle}
                onChange={(event) => setHandle(event.target.value)}
                placeholder="@identifiant"
                className="min-h-11 flex-1 rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-950 shadow-sm outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <Button type="submit" disabled={isSendingRequest}>
                <Send aria-hidden="true" className="size-4" />
                {isSendingRequest ? 'Envoi…' : 'Envoyer'}
              </Button>
            </form>
          </Card>

          {outgoingRequests.length > 0 ? (
            <details className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
              <summary className="min-h-11 cursor-pointer py-2 font-semibold text-slate-900 dark:text-white">
                Demandes envoyées ({outgoingRequests.length})
              </summary>
              <div className="divide-y divide-slate-200 dark:divide-slate-800">
                {outgoingRequests.map((request) => (
                  <div key={request.id} className="py-3 text-sm">
                    <p className="font-semibold text-slate-900 dark:text-white">{request.displayName}</p>
                    <p className="text-slate-500 dark:text-slate-400">@{request.handle} · {requestStatusLabel(request)}</p>
                  </div>
                ))}
              </div>
            </details>
          ) : null}
      </div>

      <div
        id="friends-panel-profile"
        role="tabpanel"
        aria-labelledby="friends-title"
        className="space-y-4"
        hidden={section !== 'profile'}
      >
          <Card className="p-5 sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-slate-950 dark:text-white">Profil</h2>
                <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{formatSocialHandle(identity.handle)}</p>
              </div>
              <Button type="button" size="sm" variant="secondary" onClick={copyIdentity}>Copier</Button>
            </div>
            <form className="mt-5 grid gap-4 md:grid-cols-2" onSubmit={submitIdentity}>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Identifiant public
                <input
                  value={identityHandle}
                  onChange={(event) => {
                    setIdentityHandle(event.target.value);
                    setAvailability(initialAvailability);
                  }}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                Nom affiché
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 font-normal text-slate-950 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                />
              </label>
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">Visibilité du profil</p>
                <div className="mt-2 grid gap-2 sm:grid-cols-3">
                  {visibilityOptions.map((option) => (
                    <Button
                      key={option}
                      type="button"
                      variant={snapshot.privacy.profileVisibility === option ? 'primary' : 'secondary'}
                      onClick={() => updateProfileVisibility(option)}
                      aria-pressed={snapshot.privacy.profileVisibility === option}
                    >
                      {FRIEND_PROFILE_VISIBILITY_LABELS[option]}
                    </Button>
                  ))}
                </div>
              </div>
              <label className="flex min-h-11 items-center gap-3 md:col-span-2">
                <input
                  type="checkbox"
                  checked={snapshot.privacy.allowFriendRequests}
                  onChange={() => update((actions) => actions.setRequestsOpen(!snapshot.privacy.allowFriendRequests))}
                  className="size-4 rounded border-slate-300 text-brand-700"
                />
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Autoriser les demandes d’amis</span>
              </label>
              <div className="flex flex-wrap gap-2 md:col-span-2">
                <Button type="button" variant="secondary" onClick={verifyAvailability} disabled={isCheckingAvailability}>
                  {isCheckingAvailability ? 'Vérification…' : 'Vérifier disponibilité'}
                </Button>
                <Button type="submit">Enregistrer</Button>
              </div>
              {handleValidation.status !== 'valid' ? (
                <p className="text-sm text-red-700 md:col-span-2 dark:text-red-300">{handleValidation.message}</p>
              ) : availability.status !== 'idle' ? (
                <p className="text-sm text-slate-600 md:col-span-2 dark:text-slate-300">{availability.message}</p>
              ) : null}
            </form>
          </Card>
          <InlineNotice title="Partage des activités">
            Les nouvelles relations voient un résumé par défaut. Tu peux personnaliser ce réglage depuis l’onglet Amis.
          </InlineNotice>
      </div>

      <BottomSheet
        open={Boolean(selectedFriend)}
        title={selectedFriend ? `Partage avec ${selectedFriend.displayName}` : 'Gérer le partage'}
        description="Choisis les informations visibles par cet ami."
        onClose={() => setManagedFriend(undefined)}
      >
        {selectedFriend && selectedFriendSharing ? (
          <div className="space-y-4">
            <SocialActivityFriendSharingSettings
              friendDisplayName={selectedFriend.displayName}
              sharingLevel={selectedFriendSharing.permission.sharingLevel}
              value={selectedFriendSharing.permission.fieldSelection ?? DEFAULT_DETAILED_SOCIAL_ACTIVITY_FIELD_SELECTION}
              onSharingLevelChange={(sharingLevel) => updateFriendPermission(selectedFriend, sharingLevel)}
              onSaveFields={(fieldSelection) => updateFriendFieldSelection(selectedFriend, fieldSelection)}
              defaultOpen
            />
            <Button
              className="w-full"
              variant="dangerGhost"
              onClick={() => {
                setManagedFriend(undefined);
                setPendingFriendRemoval(selectedFriend);
              }}
            >
              <X aria-hidden="true" className="size-4" />
              Supprimer cet ami
            </Button>
          </div>
        ) : null}
      </BottomSheet>

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
