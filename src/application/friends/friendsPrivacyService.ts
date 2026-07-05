import type { EntityId } from '@/domain/models/common';
import {
  acceptFriendRequest,
  addOutgoingFriendRequest,
  createOutgoingFriendRequest,
  declineFriendRequest,
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  summarizeFriendsPrivacy,
  updateFriendsPrivacySettings,
  type FriendActivitySharingLevel,
  type FriendProfileSummary,
  type FriendRequest,
  type FriendsPrivacySettings,
  type FriendsPrivacySnapshot,
  type FriendVisibilityLevel,
} from '@/domain/friends/friendship';

export interface FriendsPrivacyServiceState extends FriendsPrivacySnapshot {
  readonly lastFeedback?: string;
}

export interface FriendsPrivacySnapshotRepository {
  readonly readSnapshot: () => Promise<FriendsPrivacySnapshot>;
  readonly saveSnapshot: (snapshot: FriendsPrivacySnapshot) => Promise<void>;
}

export interface FriendsPrivacyServiceActions {
  readonly acceptRequest: (requestId: EntityId) => FriendsPrivacyServiceState;
  readonly declineRequest: (requestId: EntityId) => FriendsPrivacyServiceState;
  readonly sendRequest: (handle: string) => FriendsPrivacyServiceState;
  readonly setProfileVisibility: (visibility: FriendVisibilityLevel) => FriendsPrivacyServiceState;
  readonly setActivitySharing: (sharing: FriendActivitySharingLevel) => FriendsPrivacyServiceState;
  readonly setRequestsOpen: (open: boolean) => FriendsPrivacyServiceState;
}

export interface FriendsPrivacyService {
  readonly getState: () => FriendsPrivacyServiceState;
  readonly getSummary: () => ReturnType<typeof summarizeFriendsPrivacy>;
  readonly actions: FriendsPrivacyServiceActions;
}

const demoFriends: readonly FriendProfileSummary[] = [
  {
    id: 'friend:lea-cardio' as EntityId,
    displayName: 'Léa Cardio',
    handle: 'lea.cardio',
    initials: 'LC',
    connectedSince: '2026-07-01T08:00:00.000Z',
  },
];

const demoRequests: readonly FriendRequest[] = [
  {
    id: 'request:incoming:nora-trail' as EntityId,
    displayName: 'Nora Trail',
    handle: 'nora.trail',
    direction: 'incoming',
    status: 'pending',
    requestedAt: '2026-07-04T18:30:00.000Z',
  },
  {
    id: 'request:outgoing:mathis-run' as EntityId,
    displayName: 'Mathis Run',
    handle: 'mathis.run',
    direction: 'outgoing',
    status: 'pending',
    requestedAt: '2026-07-03T12:15:00.000Z',
  },
];

export function createEmptyFriendsPrivacySnapshot(): FriendsPrivacySnapshot {
  return {
    friends: [],
    requests: [],
    privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  };
}

export function createDefaultFriendsPrivacySnapshot(): FriendsPrivacySnapshot {
  return {
    friends: demoFriends,
    requests: demoRequests,
    privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  };
}

export async function loadFriendsPrivacySnapshot(
  repository: FriendsPrivacySnapshotRepository,
): Promise<FriendsPrivacySnapshot> {
  return repository.readSnapshot();
}

export async function persistFriendsPrivacySnapshot(
  repository: FriendsPrivacySnapshotRepository,
  snapshot: FriendsPrivacySnapshot,
): Promise<void> {
  await repository.saveSnapshot(snapshot);
}

export function createFriendsPrivacyService(
  initialState: FriendsPrivacySnapshot = createDefaultFriendsPrivacySnapshot(),
): FriendsPrivacyService {
  let state: FriendsPrivacyServiceState = initialState;

  const setState = (
    snapshot: FriendsPrivacySnapshot,
    lastFeedback?: string,
  ): FriendsPrivacyServiceState => {
    state = lastFeedback === undefined ? snapshot : { ...snapshot, lastFeedback };
    return state;
  };

  const updatePrivacy = (
    changes: Partial<FriendsPrivacySettings>,
    feedback: string,
  ) => setState({
    ...state,
    privacy: updateFriendsPrivacySettings(state.privacy, changes),
  }, feedback);

  return {
    getState: () => state,
    getSummary: () => summarizeFriendsPrivacy(state),
    actions: {
      acceptRequest: (requestId) => setState(
        acceptFriendRequest(state, requestId),
        'Demande acceptée. Le partage détaillé reste désactivé tant que tu ne l’actives pas.',
      ),
      declineRequest: (requestId) => setState(
        declineFriendRequest(state, requestId),
        'Demande refusée. Aucun accès à tes données n’a été accordé.',
      ),
      sendRequest: (handle) => {
        if (!createOutgoingFriendRequest(handle)) {
          return setState(state, 'Identifiant ami trop court ou invalide.');
        }

        const updated = addOutgoingFriendRequest(state, handle);
        return setState(
          updated,
          updated === state
            ? 'Ce contact est déjà connu ou une demande est en attente.'
            : 'Demande envoyée. Elle devra être acceptée avant tout accès ami.',
        );
      },
      setProfileVisibility: (visibility) => updatePrivacy(
        { profileVisibility: visibility },
        visibility === 'private'
          ? 'Profil passé en privé. Le partage d’activité est désactivé.'
          : 'Visibilité du profil mise à jour.',
      ),
      setActivitySharing: (sharing) => updatePrivacy(
        { activitySharing: sharing },
        sharing === 'disabled'
          ? 'Partage d’activité désactivé.'
          : 'Niveau de partage préparé. Les données détaillées restent soumises à consentement.',
      ),
      setRequestsOpen: (open) => updatePrivacy(
        { allowFriendRequests: open },
        open ? 'Les demandes d’amis sont autorisées.' : 'Les nouvelles demandes d’amis sont bloquées.',
      ),
    },
  };
}
