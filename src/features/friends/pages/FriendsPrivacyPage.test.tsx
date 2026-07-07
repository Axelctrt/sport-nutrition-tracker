import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EntityId } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';
import type { SocialCloudFriendRequestPort, SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import { createFoundSocialUserLookupGateway, type SocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';
import type { SocialFriendsGateway } from '@/infrastructure/sync-prototype/socialFriendsGateway';
import type { SocialActivityFeedCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';

const snapshot: FriendsPrivacySnapshot = {
  friends: [
    {
      id: 'social-user:lea' as EntityId,
      userId: 'social-user:lea' as EntityId,
      displayName: 'Léa Cardio',
      handle: 'lea.cardio',
      initials: 'LC',
    },
  ],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  requests: [
    {
      id: 'request:nora' as EntityId,
      requesterUserId: 'social-user:nora' as EntityId,
      recipientUserId: 'social-user:alex123' as EntityId,
      displayName: 'Nora Trail',
      handle: 'nora.trail',
      direction: 'incoming',
      status: 'pending',
      requestedAt: '2026-07-05T00:00:00.000Z',
    },
    {
      id: 'request:mathis' as EntityId,
      requesterUserId: 'social-user:alex123' as EntityId,
      recipientUserId: 'social-user:mathis' as EntityId,
      displayName: 'Mathis Run',
      handle: 'mathis.run',
      direction: 'outgoing',
      status: 'pending',
      requestedAt: '2026-07-04T00:00:00.000Z',
    },
  ],
};

const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'alex123');

function renderPage(override: {
  readonly lookupGateway?: SocialUserLookupGateway;
  readonly cloudIdentityPort?: SocialCloudIdentityPort;
  readonly cloudFriendRequestPort?: SocialCloudFriendRequestPort;
  readonly socialFriendsGateway?: SocialFriendsGateway;
  readonly initialSnapshot?: FriendsPrivacySnapshot;
  readonly initialActivitySnapshots?: readonly SocialActivitySnapshot[];
  readonly activityFeedCloudGateway?: SocialActivityFeedCloudGateway;
  readonly activityFeedCloudCredentials?: () => { readonly userId: string; readonly accessToken: string } | undefined;
} = {}) {
  const pageProps = {
    initialSnapshot: override.initialSnapshot ?? snapshot,
    initialIdentity: identity,
    ...(override.lookupGateway ? { lookupGateway: override.lookupGateway } : {}),
    ...(override.cloudIdentityPort ? { cloudIdentityPort: override.cloudIdentityPort } : {}),
    ...(override.cloudFriendRequestPort ? { cloudFriendRequestPort: override.cloudFriendRequestPort } : {}),
    ...(override.socialFriendsGateway ? { socialFriendsGateway: override.socialFriendsGateway } : {}),
    ...(override.initialActivitySnapshots ? { initialActivitySnapshots: override.initialActivitySnapshots } : {}),
    ...(override.activityFeedCloudGateway ? { activityFeedCloudGateway: override.activityFeedCloudGateway } : {}),
    ...(override.activityFeedCloudCredentials ? { activityFeedCloudCredentials: override.activityFeedCloudCredentials } : {}),
  };

  return render(<FriendsPrivacyPage {...pageProps} />);
}

describe('FriendsPrivacyPage', () => {
  it('affiche le socle amis, l’identité sociale, les demandes et les réglages de confidentialité', () => {
    renderPage();

    expect(screen.getByRole('heading', { name: 'Amis et confidentialité' })).toBeInTheDocument();
    expect(screen.getByText('Mon identifiant SportPilot')).toBeInTheDocument();
    expect(screen.getByText('@sp-alex123')).toBeInTheDocument();
    expect(screen.getByText(/Le userId interne reste privé/u)).toBeInTheDocument();
    expect(screen.getByText('Léa Cardio')).toBeInTheDocument();
    expect(screen.getByText('Nora Trail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partage désactivé' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Les données détaillées restent privées/u)).toBeInTheDocument();
    expect(screen.getByText('Fil d’activité sécurisé 0.29')).toBeInTheDocument();
    expect(screen.getByText(/uniquement des snapshots filtrés/u)).toBeInTheDocument();
    expect(screen.getByText(/détail est revérifié par le serveur/u)).toBeInTheDocument();
    expect(screen.getByText(/Likes, commentaires, messagerie, défis/u)).toBeInTheDocument();
    expect(screen.getByText(/migration D1 et le déploiement/u)).toBeInTheDocument();
    expect(screen.getByText('Fil d’activité amis')).toBeInTheDocument();
    expect(screen.getAllByText(/Partage d’activité désactivé : aucun snapshot n’est affiché/u).length).toBeGreaterThan(0);
    expect(screen.getByText(/Permission : Résumé uniquement/u)).toBeInTheDocument();
  });

  it('enregistre un handle public valide en sauvegarde locale sans cloud réel', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.clear(screen.getByLabelText('Identifiant public'));
    await user.type(screen.getByLabelText('Identifiant public'), '@alex.run');
    await user.clear(screen.getByLabelText('Nom affiché'));
    await user.type(screen.getByLabelText('Nom affiché'), 'Alex Run');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText(/Sauvegarde locale OK/u)).toBeInTheDocument();
    expect(screen.getByText('@alex.run')).toBeInTheDocument();
  });

  it('publie le handle dans le cloud social quand un port réel est fourni', async () => {
    const user = userEvent.setup();
    const publishedIdentities: unknown[] = [];
    const cloudIdentityPort: SocialCloudIdentityPort = {
      async readCurrentIdentity() {
        return undefined;
      },
      async lookupByHandle() {
        return { status: 'notFound' };
      },
      async reserveHandle(identity) {
        return {
          status: 'created',
          value: identity,
          message: 'Identifiant cloud réservé.',
        };
      },
      async publishIdentity(identity) {
        publishedIdentities.push(identity);
        return {
          status: 'created',
          value: identity,
          message: 'Identité sociale cloud créée.',
        };
      },
    };

    renderPage({ cloudIdentityPort });

    await user.clear(screen.getByLabelText('Identifiant public'));
    await user.type(screen.getByLabelText('Identifiant public'), '@alex.run');
    await user.clear(screen.getByLabelText('Nom affiché'));
    await user.type(screen.getByLabelText('Nom affiché'), 'Alex Run');
    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));

    expect(await screen.findByText(/Identité sociale cloud créée/u)).toBeInTheDocument();
    expect(publishedIdentities).toEqual([
      expect.objectContaining({
        userId: identity.userId,
        handle: 'alex.run',
        displayName: 'Alex Run',
      }),
    ]);
  });

  it('vérifie la disponibilité via une recherche exacte branchable', async () => {
    const user = userEvent.setup();
    const lookupGateway = createFoundSocialUserLookupGateway([]);
    renderPage({ lookupGateway });

    await user.clear(screen.getByLabelText('Identifiant public'));
    await user.type(screen.getByLabelText('Identifiant public'), '@lina.trail');
    await user.click(screen.getByRole('button', { name: 'Vérifier disponibilité' }));

    expect(await screen.findByText('Identifiant disponible.')).toBeInTheDocument();
  });

  it('retourne un état cloud indisponible sans backend social', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Vérifier disponibilité' }));

    expect(await screen.findByText(/Compte cloud indisponible/u)).toBeInTheDocument();
  });

  it('accepte une demande reçue sans activer le partage détaillé', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: /Accepter/u }));

    expect(await screen.findByText(/Demande acceptée/u)).toBeInTheDocument();
    expect(await screen.findByText(/2 amis/u)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partage désactivé' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('envoie une demande réelle vers un identifiant trouvé et bloque les doublons', async () => {
    const user = userEvent.setup();
    const lookupGateway = createFoundSocialUserLookupGateway([
      {
        userId: 'social-user:romain' as EntityId,
        handle: 'romain.run',
        displayName: 'Romain Run',
        createdAt: '2026-07-05T09:00:00.000Z',
        updatedAt: '2026-07-05T09:00:00.000Z',
      },
    ]);
    renderPage({
      lookupGateway,
      initialSnapshot: { ...snapshot, requests: [] },
    });

    await user.type(screen.getByLabelText('Identifiant SportPilot'), '@romain.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    const sentMessages = await screen.findAllByText(/Demande envoyée à @romain\.run/u);
    expect(sentMessages).toHaveLength(2);

    await user.type(screen.getByLabelText('Identifiant SportPilot'), '@romain.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    expect(await screen.findByText(/Une demande est déjà envoyée/u)).toBeInTheDocument();
  });

  it('envoie la demande via le port cloud F4 quand il est fourni', async () => {
    const user = userEvent.setup();
    const sentRequests: unknown[] = [];
    const lookupGateway = createFoundSocialUserLookupGateway([
      {
        userId: 'social-user:romain' as EntityId,
        handle: 'romain.run',
        displayName: 'Romain Run',
        createdAt: '2026-07-05T09:00:00.000Z',
        updatedAt: '2026-07-05T09:00:00.000Z',
      },
    ]);
    const cloudFriendRequestPort: SocialCloudFriendRequestPort = {
      async sendRequest(request) {
        sentRequests.push(request);
        return {
          status: 'created',
          value: request,
          message: 'Demande d’ami cloud envoyée.',
        };
      },
      async listIncomingRequests() {
        return [];
      },
      async listOutgoingRequests() {
        return [];
      },
      async updateRequestStatus() {
        return {
          status: 'updated',
          message: 'Demande cloud updated.',
        };
      },
    };

    renderPage({
      lookupGateway,
      cloudFriendRequestPort,
      initialSnapshot: { ...snapshot, requests: [] },
    });

    await user.type(screen.getByLabelText('Identifiant SportPilot'), '@romain.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    expect((await screen.findAllByText(/Demande envoyée à @romain\.run/u)).length).toBeGreaterThan(0);
    expect(sentRequests).toEqual([
      expect.objectContaining({
        requesterUserId: identity.userId,
        recipientUserId: 'social-user:romain',
        status: 'pending',
      }),
    ]);
  });

  it('affiche identifiant inexistant lorsque la recherche exacte ne trouve personne', async () => {
    const user = userEvent.setup();
    renderPage({ lookupGateway: createFoundSocialUserLookupGateway([]) });

    await user.type(screen.getByLabelText('Identifiant SportPilot'), '@ghost.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    expect(await screen.findByText('Identifiant inexistant.')).toBeInTheDocument();
  });

  it('bloque une demande vers soi-même', async () => {
    const user = userEvent.setup();
    renderPage({
      lookupGateway: createFoundSocialUserLookupGateway([
        {
          userId: identity.userId,
          handle: identity.handle,
          displayName: identity.displayName,
          createdAt: identity.createdAt,
          updatedAt: identity.updatedAt,
        },
      ]),
    });

    await user.type(screen.getByLabelText('Identifiant SportPilot'), '@sp-alex123');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    expect(await screen.findByText(/toi-même/u)).toBeInTheDocument();
  });

  it('règle le détail ami par ami après consentement explicite local', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('button', { name: 'Autoriser le détail' })).not.toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Détaillé après accord' }));
    await user.click(screen.getByRole('button', { name: 'Autoriser le détail' }));

    expect(screen.getByText(/Consentement détaillé enregistré pour cet ami/u)).toBeInTheDocument();
    expect(screen.getByText(/Permission : Détail autorisé/u)).toBeInTheDocument();
    expect(screen.getAllByText(/Détail autorisé localement pour cet ami/u).length).toBeGreaterThan(0);
    expect(screen.getByText(/snapshots sociaux filtrés peuvent utiliser ce niveau/u)).toBeInTheDocument();
  });

  it('synchronise la permission serveur pour un ami local enrichi par friendship cloud', async () => {
    const user = userEvent.setup();
    const savedPermissions: unknown[] = [];
    const localOnlySnapshot: FriendsPrivacySnapshot = {
      ...snapshot,
      requests: [],
      friends: [
        {
          id: 'friend:lea.cardio' as EntityId,
          displayName: 'Léa Cardio',
          handle: 'lea.cardio',
          initials: 'LC',
        },
      ],
    };
    const socialFriendsGateway: SocialFriendsGateway = {
      friendshipPort: {
        async listFriendships() {
          return [];
        },
        async upsertFriendship() {
          return { status: 'unavailable', message: 'Non utilisé.' };
        },
      },
      permissionPort: {
        async listPermissions() {
          return [];
        },
        async savePermission(userId, permission) {
          savedPermissions.push({ userId, permission });
          return {
            status: 'created',
            value: permission,
            message: 'Permission ami serveur créée.',
          };
        },
      },
      async listFriendshipsWithProfiles() {
        return {
          friendships: [
            {
              id: 'cloud-friendship:social-user:alex123<->social-user:lea' as EntityId,
              userAId: identity.userId,
              userBId: 'social-user:lea' as EntityId,
              status: 'active',
              createdAt: '2026-07-05T12:00:00.000Z',
              updatedAt: '2026-07-05T12:00:00.000Z',
            },
          ],
          profiles: [
            {
              userId: 'social-user:lea' as EntityId,
              handle: 'lea.cardio',
              displayName: 'Léa Cardio',
              createdAt: '2026-07-05T12:00:00.000Z',
              updatedAt: '2026-07-05T12:00:00.000Z',
            },
          ],
        };
      },
    };

    renderPage({ initialSnapshot: localOnlySnapshot, socialFriendsGateway });

    await user.click(screen.getByRole('button', { name: 'Détaillé après accord' }));
    await user.click(screen.getByRole('button', { name: 'Autoriser le détail' }));

    expect((await screen.findAllByText(/Permission ami serveur créée/u)).length).toBeGreaterThan(0);
    expect(savedPermissions).toEqual([
      {
        userId: identity.userId,
        permission: expect.objectContaining({
          friendUserId: 'social-user:lea',
          sharingLevel: 'detailed',
          detailedConsent: 'granted',
        }),
      },
    ]);
  });

  it('branche le fil cloud réel lorsqu’un gateway authentifié est fourni', async () => {
    const activityFeedCloudGateway: SocialActivityFeedCloudGateway = {
      listPage: vi.fn(async () => ({
        items: [{
          contractVersion: '0.29.0-a3' as const,
          snapshotId: 'social-activity-snapshot-v2:lea:activity:run-cloud:alex123' as EntityId,
          ownerUserId: 'social-user:lea' as EntityId,
          recipientUserId: identity.userId,
          sourceKind: 'activity' as const,
          sourceActivityId: 'run-cloud' as EntityId,
          sourceRevision: 'revision-cloud',
          createdAt: '2026-07-10T10:00:00.000Z',
          updatedAt: '2026-07-10T10:00:00.000Z',
          state: 'active' as const,
          visibility: 'summary' as const,
          family: 'cardio' as const,
          activityType: 'running' as const,
          title: 'Course cloud réelle',
          occurredOn: '2026-07-10',
          allowedFields: {
            common: ['activityType', 'title', 'date', 'duration'] as const,
            cardio: ['distance'] as const,
            strength: [] as const,
          },
          summary: { durationMinutes: 44, distanceKm: 7.4 },
          detailAvailable: false,
          ownerProfile: {
            userId: 'social-user:lea',
            handle: 'lea.cardio',
            displayName: 'Léa Cardio',
          },
        }],
      })),
      readDetail: vi.fn(async () => { throw new Error('Détail non attendu.'); }),
    };

    renderPage({
      activityFeedCloudGateway,
      activityFeedCloudCredentials: () => ({ userId: identity.userId, accessToken: 'token' }),
    });

    expect(await screen.findByText('Course cloud réelle')).toBeInTheDocument();
    expect(screen.getByText('7.4 km')).toBeInTheDocument();
    expect(activityFeedCloudGateway.listPage).toHaveBeenCalledTimes(1);
  });

  it('affiche un fil amis minimal depuis des snapshots filtrés', () => {
    const detailedSnapshot = updateFriendActivityPermission({
      ...snapshot,
      requests: [],
      privacy: {
        ...snapshot.privacy,
        activitySharing: 'detailed',
      },
    }, 'social-user:lea' as EntityId, 'detailed', '2026-07-10T08:00:00.000Z');
    const activitySnapshots: readonly SocialActivitySnapshot[] = [
      {
        id: 'social-activity-snapshot:run-feed:lea:detailed' as EntityId,
        sourceActivityId: 'activity:private-feed' as EntityId,
        friendId: 'social-user:lea' as EntityId,
        friendHandle: 'lea.cardio',
        scope: 'detailed',
        activityType: 'running',
        date: '2026-07-10',
        durationMinutes: 45,
        intensity: 'moderate',
        estimatedCaloriesKcal: 420,
        createdAt: '2026-07-10T10:00:00.000Z',
        guardReason: 'Détail autorisé localement pour cet ami après consentement explicite.',
        metrics: {
          distanceKm: 7.1,
          elevationGainMeters: 90,
          sessionType: 'tempo',
          terrainType: 'trail',
        },
      },
    ];

    renderPage({
      initialSnapshot: detailedSnapshot,
      initialActivitySnapshots: activitySnapshots,
    });

    expect(screen.getByText('Fil d’activité amis')).toBeInTheDocument();
    expect(screen.getAllByText('Léa Cardio').length).toBeGreaterThan(1);
    expect(screen.getByText(/Détail autorisé · Course/u)).toBeInTheDocument();
    expect(screen.getByText('7.1 km')).toBeInTheDocument();
    expect(screen.getByText('D+ 90 m')).toBeInTheDocument();
    expect(screen.getByText('tempo')).toBeInTheDocument();
    expect(screen.getByText('trail')).toBeInTheDocument();
    expect(screen.getByText('Aucun champ brut d’activité n’est affiché.')).toBeInTheDocument();
    expect(screen.queryByText(/activity:private-feed/u)).not.toBeInTheDocument();
  });

  it('dégrade dans le fil un snapshot détaillé quand la permission est limitée', () => {
    const summarySnapshot: FriendsPrivacySnapshot = {
      ...snapshot,
      requests: [],
      privacy: {
        ...snapshot.privacy,
        activitySharing: 'summary-only',
      },
    };
    const activitySnapshots: readonly SocialActivitySnapshot[] = [
      {
        id: 'social-activity-snapshot:run-feed-limited:lea:detailed' as EntityId,
        sourceActivityId: 'activity:private-limited' as EntityId,
        friendId: 'social-user:lea' as EntityId,
        friendHandle: 'lea.cardio',
        scope: 'detailed',
        activityType: 'running',
        date: '2026-07-11',
        durationMinutes: 38,
        intensity: 'low',
        estimatedCaloriesKcal: 330,
        createdAt: '2026-07-11T10:00:00.000Z',
        guardReason: 'Détail autorisé localement pour cet ami après consentement explicite.',
        metrics: {
          distanceKm: 6.2,
          sessionType: 'tempo',
          terrainType: 'trail',
        },
      },
    ];

    renderPage({
      initialSnapshot: summarySnapshot,
      initialActivitySnapshots: activitySnapshots,
    });

    expect(screen.getByText(/Résumé · Course/u)).toBeInTheDocument();
    expect(screen.getByText(/Détail limité par permission actuelle/u)).toBeInTheDocument();
    expect(screen.queryByText('tempo')).not.toBeInTheDocument();
    expect(screen.queryByText('trail')).not.toBeInTheDocument();
  });

});

