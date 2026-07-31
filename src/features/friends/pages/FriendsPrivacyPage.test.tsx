import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EntityId } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';
import type { SocialCloudFriendPermissionPort, SocialCloudFriendRequestPort, SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import { createFoundSocialUserLookupGateway, type SocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';
import type { SocialFriendsGateway } from '@/infrastructure/sync-prototype/socialFriendsGateway';
import type { SocialActivityFeedCloudGateway } from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';
import {
  SYNC_LOCAL_DATA_CHANGED_EVENT,
  syncLocalDataChangedDetail,
} from '@/application/sync/syncLocalChangeEvents';
import { SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT } from '@/infrastructure/sync-prototype/socialActivityPrivacySyncEvents';

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
  readonly privacyReconciliation?: () => Promise<unknown>;
  readonly repository?: FriendsPrivacySnapshotRepository;
  readonly identityReconciliation?: (identity: import('@/domain/friends/socialIdentity').SocialIdentity) => Promise<{
    readonly status: 'reconciled' | 'alreadyCanonical' | 'notConnected' | 'conflict' | 'unavailable';
    readonly identity: import('@/domain/friends/socialIdentity').SocialIdentity;
    readonly migratedUserIds: readonly string[];
    readonly message: string;
  }>;
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
    ...(override.privacyReconciliation ? { privacyReconciliation: override.privacyReconciliation } : {}),
    ...(override.repository ? { repository: override.repository } : {}),
    ...(override.identityReconciliation ? { identityReconciliation: override.identityReconciliation } : {}),
  };

  return render(<FriendsPrivacyPage {...pageProps} />);
}

beforeEach(() => {
  window.history.replaceState({}, '', '/#/friends');
});

describe('FriendsPrivacyPage', () => {
  it('affiche quatre vraies rubriques sans texte de diagnostic dans le parcours courant', async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByRole('heading', { name: 'Amis' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Fil d’activité' })).toHaveAttribute('aria-current', 'page');
    expect(screen.getByText('Fil d’activité amis')).toBeInTheDocument();
    expect(screen.queryByText(/migration D1/u)).not.toBeInTheDocument();
    expect(screen.queryByText(/snapshots filtrés/u)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
    expect(screen.getByRole('heading', { name: 'Profil', level: 2 })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Mon profil', level: 2 })).not.toBeInTheDocument();
    expect(screen.getByText('@sp-alex123')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Visible par les amis' })).toHaveAttribute('aria-pressed', 'true');

    await user.click(screen.getByRole('button', { name: 'Mes amis' }));
    expect(screen.getByText('Léa Cardio')).toBeInTheDocument();
    expect(screen.getByText('Partage : Résumé')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Gérer' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Demandes d’amis' }));
    expect(screen.getByText('Nora Trail')).toBeInTheDocument();
  });


  it('synchronise la visibilité du profil sans modifier les permissions par ami', async () => {
    const user = userEvent.setup();
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => snapshot),
      saveSnapshot: vi.fn(async () => undefined),
    };
    const details: unknown[] = [];
    const listener = (event: Event) => {
      details.push(syncLocalDataChangedDetail(event));
    };
    window.addEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);

    try {
      renderPage({ repository });
      await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
      await user.click(screen.getByRole('button', { name: 'Profil privé' }));

      await waitFor(() => {
        expect(repository.saveSnapshot).toHaveBeenCalled();
        expect(details).toContainEqual({
          domainIds: ['account-preferences'],
          reason: 'social-profile-visibility-update',
        });
      });
      expect(screen.getByText('Partage : Résumé')).toBeInTheDocument();
    } finally {
      window.removeEventListener(SYNC_LOCAL_DATA_CHANGED_EVENT, listener);
    }
  });

  it('persiste les amitiés cloud avant de réconcilier les snapshots existants', async () => {
    const localSnapshot: FriendsPrivacySnapshot = {
      ...snapshot,
      friends: [],
      requests: [],
      activityPermissions: [],
    };
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => localSnapshot),
      saveSnapshot: vi.fn(async () => undefined),
    };
    const identityRepository = {
      readIdentity: vi.fn(async () => identity),
      saveIdentity: vi.fn(async () => undefined),
    };
    const privacyReconciliation = vi.fn(async () => undefined);
    const socialFriendsGateway: SocialFriendsGateway = {
      friendshipPort: {
        listFriendships: vi.fn(async () => []),
        upsertFriendship: vi.fn(async () => ({
          status: 'unavailable' as const,
          message: 'Non utilisé.',
        })),
      },
      permissionPort: {
        listPermissions: vi.fn(async () => [{
          id: 'friend-activity-permission:social-user:lea' as EntityId,
          friendUserId: 'social-user:lea' as EntityId,
          friendHandle: 'lea.cardio',
          sharingLevel: 'summary' as const,
          detailedConsent: 'notRequested' as const,
        }]),
        savePermission: vi.fn(async (_userId, permission) => ({
          status: 'alreadyExists' as const,
          value: permission,
          message: 'Non utilisé.',
        })),
      },
      listFriendshipsWithProfiles: vi.fn(async () => ({
        friendships: [{
          id: 'cloud-friendship:social-user:alex123<->social-user:lea' as EntityId,
          userAId: identity.userId,
          userBId: 'social-user:lea' as EntityId,
          status: 'active' as const,
          createdAt: '2026-07-05T12:00:00.000Z',
          updatedAt: '2026-07-05T12:00:00.000Z',
        }],
        profiles: [{
          userId: 'social-user:lea' as EntityId,
          handle: 'lea.cardio',
          displayName: 'Léa Cardio',
          createdAt: '2026-07-05T12:00:00.000Z',
          updatedAt: '2026-07-05T12:00:00.000Z',
        }],
      })),
    };

    render(
      <FriendsPrivacyPage
        repository={repository}
        identityRepository={identityRepository}
        socialFriendsGateway={socialFriendsGateway}
        privacyReconciliation={privacyReconciliation}
      />,
    );

    expect(await screen.findByText('Léa Cardio')).toBeInTheDocument();
    await waitFor(() => {
      expect(repository.saveSnapshot).toHaveBeenCalledOnce();
      expect(privacyReconciliation).toHaveBeenCalledOnce();
    });

    const persistedSnapshot = vi.mocked(repository.saveSnapshot).mock.calls[0]?.[0];
    expect(persistedSnapshot).toMatchObject({
      friends: [{
        userId: 'social-user:lea',
        handle: 'lea.cardio',
      }],
      activityPermissions: [{
        friendUserId: 'social-user:lea',
        sharingLevel: 'summary',
      }],
    });
    expect(vi.mocked(repository.saveSnapshot).mock.invocationCallOrder[0])
      .toBeLessThan(privacyReconciliation.mock.invocationCallOrder[0]!);
  });


  it('charge les amitiés avec le userId Dexie Cloud réconcilié', async () => {
    const canonicalIdentity = {
      ...identity,
      userId: 'dexie-user-123' as EntityId,
      handle: 'alex.run',
      displayName: 'Alex Run',
    };
    const socialFriendsGateway: SocialFriendsGateway = {
      friendshipPort: {
        listFriendships: vi.fn(async () => []),
        upsertFriendship: vi.fn(async () => ({
          status: 'unavailable' as const,
          message: 'Non utilisé.',
        })),
      },
      permissionPort: {
        listPermissions: vi.fn(async () => []),
        savePermission: vi.fn(async (_userId, permission) => ({
          status: 'alreadyExists' as const,
          value: permission,
          message: 'Non utilisé.',
        })),
      },
      listFriendshipsWithProfiles: vi.fn(async () => ({
        friendships: [],
        profiles: [],
      })),
    };

    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => ({
        ...snapshot,
        friends: [],
        requests: [],
        activityPermissions: [],
      })),
      saveSnapshot: vi.fn(async () => undefined),
    };
    const identityRepository = {
      readIdentity: vi.fn(async () => identity),
      saveIdentity: vi.fn(async () => undefined),
    };

    render(
      <FriendsPrivacyPage
        repository={repository}
        identityRepository={identityRepository}
        socialFriendsGateway={socialFriendsGateway}
        identityReconciliation={vi.fn(async () => ({
          status: 'reconciled' as const,
          identity: canonicalIdentity,
          migratedUserIds: [identity.userId],
          message: 'Identité réconciliée.',
        }))}
      />,
    );

    await waitFor(() => {
      expect(socialFriendsGateway.listFriendshipsWithProfiles)
        .toHaveBeenCalledWith(canonicalIdentity.userId);
      expect(socialFriendsGateway.permissionPort.listPermissions)
        .toHaveBeenCalledWith(canonicalIdentity.userId);
    });
    expect(screen.getByText('@alex.run')).toBeInTheDocument();
  });

  it('recharge les permissions par ami lorsqu’une préférence sociale arrive du cloud', async () => {
    const detailedSnapshot = updateFriendActivityPermission(
      snapshot,
      'social-user:lea' as EntityId,
      'detailed',
      '2026-07-08T12:00:00.000Z',
    );
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => detailedSnapshot),
      saveSnapshot: vi.fn(async () => undefined),
    };

    renderPage({ repository });
    window.dispatchEvent(new Event(SOCIAL_ACTIVITY_PRIVACY_CHANGED_EVENT));

    await waitFor(() => {
      expect(screen.getByText('Partage : Personnalisé')).toBeInTheDocument();
    });
  });

  it('enregistre un handle public valide en sauvegarde locale sans cloud réel', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));

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
    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));

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
    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));

    await user.clear(screen.getByLabelText('Identifiant public'));
    await user.type(screen.getByLabelText('Identifiant public'), '@lina.trail');
    await user.click(screen.getByRole('button', { name: 'Vérifier disponibilité' }));

    expect(await screen.findByText('Identifiant disponible.')).toBeInTheDocument();
  });

  it('retourne un état cloud indisponible sans backend social', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));

    await user.click(screen.getByRole('button', { name: 'Vérifier disponibilité' }));

    expect(await screen.findByText(/Compte cloud indisponible/u)).toBeInTheDocument();
  });

  it('accepte une demande reçue sans activer le partage détaillé', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Demandes d’amis' }));

    await user.click(screen.getByRole('button', { name: /Accepter/u }));

    expect(await screen.findByText(/Demande acceptée/u)).toBeInTheDocument();
    expect(await screen.findByText(/2 amis/u)).toBeInTheDocument();
    expect(screen.getAllByText('Partage : Résumé')).toHaveLength(2);
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
    await user.click(screen.getByRole('button', { name: 'Demandes d’amis' }));

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
    await user.click(screen.getByRole('button', { name: 'Demandes d’amis' }));

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
    await user.click(screen.getByRole('button', { name: 'Demandes d’amis' }));

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
    await user.click(screen.getByRole('button', { name: 'Demandes d’amis' }));

    await user.type(screen.getByLabelText('Identifiant SportPilot'), '@sp-alex123');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    expect(await screen.findByText(/toi-même/u)).toBeInTheDocument();
  });

  it('règle le partage personnalisé directement depuis la carte de l’ami', async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole('button', { name: 'Mes amis' }));

    await user.click(screen.getByText('Gérer'));
    await user.click(screen.getByRole('button', { name: 'Personnalisé' }));

    expect((await screen.findAllByText(/Partage personnalisé enregistré pour cet ami/u)).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Partage : Personnalisé').length).toBeGreaterThan(0);
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

    await user.click(screen.getByText('Gérer'));
    await user.click(screen.getByRole('button', { name: 'Personnalisé' }));

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

  it('réconcilie les snapshots seulement après confirmation serveur de la permission ami', async () => {
    const user = userEvent.setup();
    const privacyReconciliation = vi.fn(async () => undefined);
    let resolveSave: ((value: Awaited<ReturnType<SocialCloudFriendPermissionPort['savePermission']>>) => void) | undefined;
    const savePermission = vi.fn((_userId, _permission) => new Promise<Awaited<ReturnType<SocialCloudFriendPermissionPort['savePermission']>>>((resolve) => {
      resolveSave = resolve;
    }));
    const cloudFriendPermissionPort: SocialCloudFriendPermissionPort = {
      listPermissions: vi.fn(async () => []),
      savePermission,
    };
    const detailedSnapshot: FriendsPrivacySnapshot = {
      ...snapshot,
      privacy: {
        ...snapshot.privacy,
        activitySharing: 'detailed',
        socialActivitySharingPolicy: {
          visibility: 'detailed',
          fields: snapshot.privacy.socialActivitySharingPolicy!.fields,
        },
      },
    };

    render(
      <FriendsPrivacyPage
        initialSnapshot={detailedSnapshot}
        initialIdentity={identity}
        cloudFriendPermissionPort={cloudFriendPermissionPort}
        privacyReconciliation={privacyReconciliation}
      />,
    );

    await user.click(screen.getByText('Gérer'));
    await user.click(screen.getByRole('button', { name: 'Personnalisé' }));
    await waitFor(() => expect(savePermission).toHaveBeenCalledOnce());
    expect(privacyReconciliation).not.toHaveBeenCalled();

    const savedPermission = savePermission.mock.calls[0]?.[1];
    if (!savedPermission || !resolveSave) throw new Error('Permission serveur attendue.');
    resolveSave({
      status: 'updated',
      value: savedPermission,
      message: 'Permission ami serveur mise à jour.',
    });

    await waitFor(() => expect(privacyReconciliation).toHaveBeenCalledOnce());
  });

  it('enregistre les champs granulaires d’un ami avant de réconcilier ses snapshots', async () => {
    const user = userEvent.setup();
    const privacyReconciliation = vi.fn(async () => undefined);
    const savePermission = vi.fn(async (_userId, permission) => ({
      status: 'updated' as const,
      value: permission,
      message: 'Champs ami serveur mis à jour.',
    }));
    const cloudFriendPermissionPort: SocialCloudFriendPermissionPort = {
      listPermissions: vi.fn(async () => []),
      savePermission,
    };
    const detailedSnapshot = updateFriendActivityPermission({
      ...snapshot,
      privacy: {
        ...snapshot.privacy,
        profileVisibility: 'friends',
        activitySharing: 'detailed',
        socialActivitySharingPolicy: {
          visibility: 'detailed',
          fields: snapshot.privacy.socialActivitySharingPolicy!.fields,
        },
      },
    }, 'social-user:lea' as EntityId, 'detailed', '2026-07-08T12:00:00.000Z');

    render(
      <FriendsPrivacyPage
        initialSnapshot={detailedSnapshot}
        initialIdentity={identity}
        cloudFriendPermissionPort={cloudFriendPermissionPort}
        privacyReconciliation={privacyReconciliation}
      />,
    );

    await user.click(screen.getByText('Gérer'));
    await user.click(screen.getByText('Musculation'));
    await user.click(screen.getByLabelText('Charges'));
    const sharingPanel = screen.getAllByText('Partage : Personnalisé').at(-1)?.closest('details');
    if (!sharingPanel) throw new Error('Panneau de partage attendu.');
    await user.click(within(sharingPanel).getByRole('button', { name: 'Enregistrer' }));

    await waitFor(() => expect(savePermission).toHaveBeenCalledOnce());
    const savedPermission = savePermission.mock.calls[0]?.[1];
    expect(savedPermission?.fieldSelection?.strength).not.toContain('loads');
    await waitFor(() => expect(privacyReconciliation).toHaveBeenCalledOnce());
    expect(screen.getByText(/Réglages enregistrés et snapshots sociaux remis en cohérence/u))
      .toBeInTheDocument();
  });

  it('branche le fil cloud réel lorsqu’un gateway authentifié est fourni', async () => {
    const user = userEvent.setup();
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
      readReadiness: vi.fn(async () => ({
        status: 'ready' as const,
        contractVersion: '0.29.0-a3',
        authVerified: true,
        databaseBound: true,
        requiredMigration: '0001_social_activity_snapshots_0_29_0.sql',
        missingPrerequisites: [],
        missingActivitySchema: [],
        checkedAt: '2026-07-10T10:00:00.000Z',
      })),
    };

    renderPage({
      activityFeedCloudGateway,
      activityFeedCloudCredentials: () => ({ userId: identity.userId, accessToken: 'token' }),
    });

    await user.click(screen.getByRole('button', { name: 'Fil d’activité' }));
    expect(await screen.findByText('Course cloud réelle')).toBeInTheDocument();
    expect(screen.getByText('7,4 km')).toBeInTheDocument();
    expect(activityFeedCloudGateway.listPage).toHaveBeenCalledTimes(1);
  });

  it('diffère le chargement cloud jusqu’à l’ouverture du Fil', async () => {
    const user = userEvent.setup();
    const listPage = vi.fn(async () => ({ items: [] }));
    const activityFeedCloudGateway: SocialActivityFeedCloudGateway = {
      listPage,
      readDetail: vi.fn(async () => { throw new Error('Détail non attendu.'); }),
      readReadiness: vi.fn(async () => ({
        status: 'ready' as const,
        contractVersion: '0.29.0-a3',
        authVerified: true,
        databaseBound: true,
        requiredMigration: '0001_social_activity_snapshots_0_29_0.sql',
        missingPrerequisites: [],
        missingActivitySchema: [],
        checkedAt: '2026-07-10T10:00:00.000Z',
      })),
    };
    window.history.replaceState({}, '', '/#/friends?section=friends');

    renderPage({
      activityFeedCloudGateway,
      activityFeedCloudCredentials: () => ({ userId: identity.userId, accessToken: 'token' }),
    });

    expect(listPage).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Fil d’activité' }));
    await waitFor(() => expect(listPage).toHaveBeenCalledOnce());
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


  it('enregistre aucun partage pour un ami et réconcilie ses snapshots', async () => {
    const user = userEvent.setup();
    const privacyReconciliation = vi.fn(async () => undefined);
    renderPage({ privacyReconciliation });

    await user.click(screen.getByText('Gérer'));
    await user.click(screen.getByRole('button', { name: 'Aucun' }));

    expect(await screen.findByText(/snapshots sociaux remis en cohérence/u)).toBeInTheDocument();
    expect(screen.getAllByText('Partage : Aucun').length).toBeGreaterThan(0);
    expect(privacyReconciliation).toHaveBeenCalledOnce();
  });

  it('attend la persistance de la permission ami avant de réconcilier les snapshots', async () => {
    const user = userEvent.setup();
    let resolveSave: (() => void) | undefined;
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: async () => snapshot,
      saveSnapshot: vi.fn(() => new Promise<void>((resolve) => {
        resolveSave = resolve;
      })),
    };
    const privacyReconciliation = vi.fn(async () => undefined);

    renderPage({ repository, privacyReconciliation });
    await user.click(screen.getByText('Gérer'));
    await user.click(screen.getByRole('button', { name: 'Aucun' }));

    expect(repository.saveSnapshot).toHaveBeenCalledOnce();
    expect(privacyReconciliation).not.toHaveBeenCalled();

    resolveSave?.();
    expect(await screen.findByText(/snapshots sociaux remis en cohérence/u)).toBeInTheDocument();
    expect(privacyReconciliation).toHaveBeenCalledOnce();
  });

  it('conserve le partage par ami lorsque le profil social devient privé', async () => {
    const user = userEvent.setup();
    renderPage({
      initialSnapshot: {
        ...snapshot,
        privacy: {
          ...snapshot.privacy,
          profileVisibility: 'private',
          activitySharing: 'disabled',
        },
      },
    });

    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
    expect(screen.getByRole('button', { name: 'Profil privé' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Partage : Résumé')).toBeInTheDocument();
    expect(screen.getByText(/nouvelles relations voient un résumé par défaut/u)).toBeInTheDocument();
  });

});


it('supprime un ami après confirmation et succès serveur', async () => {
  const user = userEvent.setup();
  const removeFriendship = vi.fn(async () => ({
    status: 'updated' as const,
    value: {
      id: 'cloud-friendship:social-user:alex123<->social-user:lea' as EntityId,
      userAId: identity.userId,
      userBId: 'social-user:lea' as EntityId,
      status: 'removed' as const,
      createdAt: '2026-07-05T12:00:00.000Z',
      updatedAt: '2026-07-08T12:00:00.000Z',
    },
    message: 'Ami supprimé. Les permissions associées ont été retirées.',
  }));
  const socialFriendsGateway: SocialFriendsGateway = {
    friendshipPort: {
      listFriendships: vi.fn(async () => []),
      upsertFriendship: vi.fn(async () => ({
        status: 'unavailable' as const,
        message: 'Non utilisé.',
      })),
      removeFriendship,
    },
    permissionPort: {
      listPermissions: vi.fn(async () => []),
      savePermission: vi.fn(async (_userId, permission) => ({
        status: 'updated' as const,
        value: permission,
        message: 'Non utilisé.',
      })),
    },
    listFriendshipsWithProfiles: vi.fn(async () => ({
      status: 'synchronized' as const,
      friendships: [],
      profiles: [],
    })),
    removeFriendship,
  };

  renderPage({ socialFriendsGateway });

  await user.click(screen.getByRole('button', { name: 'Mes amis' }));
  await user.click(screen.getByRole('button', { name: 'Gérer' }));
  await user.click(screen.getByRole('button', { name: 'Supprimer cet ami' }));
  expect(screen.getByRole('alertdialog', { name: 'Supprimer Léa Cardio ?' })).toBeInTheDocument();
  expect(removeFriendship).not.toHaveBeenCalled();

  await user.click(screen.getByRole('button', { name: 'Supprimer l’ami' }));

  await waitFor(() => {
    expect(removeFriendship).toHaveBeenCalledWith(identity.userId, 'social-user:lea');
    expect(screen.queryByText('Léa Cardio')).not.toBeInTheDocument();
    expect(screen.getAllByText(/Ami supprimé/u).length).toBeGreaterThan(0);
  });
});


describe('résilience sociale A23', () => {
  it('conserve les permissions locales lorsque D1 est temporairement indisponible', async () => {
    const detailedSnapshot = updateFriendActivityPermission(
      snapshot,
      'social-user:lea' as EntityId,
      'detailed',
      '2026-07-08T12:00:00.000Z',
    );
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => detailedSnapshot),
      saveSnapshot: vi.fn(async () => undefined),
    };
    const identityRepository = {
      readIdentity: vi.fn(async () => identity),
      saveIdentity: vi.fn(async () => undefined),
    };
    const socialFriendsGateway: SocialFriendsGateway = {
      friendshipPort: {
        listFriendships: vi.fn(async () => []),
        upsertFriendship: vi.fn(async () => ({
          status: 'unavailable' as const,
          message: 'Non utilisé.',
        })),
      },
      permissionPort: {
        listPermissions: vi.fn(async () => []),
        savePermission: vi.fn(async (_userId, permission) => ({
          status: 'updated' as const,
          value: permission,
          message: 'Non utilisé.',
        })),
      },
      listFriendshipsWithProfiles: vi.fn(async () => ({
        status: 'synchronized' as const,
        friendships: [{
          id: 'cloud-friendship:social-user:alex123<->social-user:lea' as EntityId,
          userAId: identity.userId,
          userBId: 'social-user:lea' as EntityId,
          status: 'active' as const,
          createdAt: '2026-07-05T12:00:00.000Z',
          updatedAt: '2026-07-05T12:00:00.000Z',
        }],
        profiles: [{
          userId: 'social-user:lea' as EntityId,
          handle: 'lea.cardio',
          displayName: 'Léa Cardio',
          createdAt: '2026-07-05T12:00:00.000Z',
          updatedAt: '2026-07-05T12:00:00.000Z',
        }],
      })),
      listPermissionsWithStatus: vi.fn(async () => ({
        status: 'unavailable' as const,
        permissions: [],
        message: 'D1 indisponible.',
      })),
    };

    render(
      <FriendsPrivacyPage
        repository={repository}
        identityRepository={identityRepository}
        socialFriendsGateway={socialFriendsGateway}
      />,
    );

    expect(await screen.findByText('Partage : Personnalisé')).toBeInTheDocument();
    await waitFor(() => expect(repository.saveSnapshot).toHaveBeenCalledOnce());
    expect(vi.mocked(repository.saveSnapshot).mock.calls[0]?.[0]).toMatchObject({
      activityPermissions: [expect.objectContaining({
        friendUserId: 'social-user:lea',
        sharingLevel: 'detailed',
      })],
    });
    expect(socialFriendsGateway.permissionPort.listPermissions).not.toHaveBeenCalled();
  });

  it('applique une purge de permissions uniquement après une réponse vide valide', async () => {
    const detailedSnapshot = updateFriendActivityPermission(
      snapshot,
      'social-user:lea' as EntityId,
      'detailed',
      '2026-07-08T12:00:00.000Z',
    );
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => detailedSnapshot),
      saveSnapshot: vi.fn(async () => undefined),
    };
    const identityRepository = {
      readIdentity: vi.fn(async () => identity),
      saveIdentity: vi.fn(async () => undefined),
    };
    const socialFriendsGateway: SocialFriendsGateway = {
      friendshipPort: {
        listFriendships: vi.fn(async () => []),
        upsertFriendship: vi.fn(async () => ({
          status: 'unavailable' as const,
          message: 'Non utilisé.',
        })),
      },
      permissionPort: {
        listPermissions: vi.fn(async () => []),
        savePermission: vi.fn(async (_userId, permission) => ({
          status: 'updated' as const,
          value: permission,
          message: 'Non utilisé.',
        })),
      },
      listFriendshipsWithProfiles: vi.fn(async () => ({
        status: 'synchronized' as const,
        friendships: [{
          id: 'cloud-friendship:social-user:alex123<->social-user:lea' as EntityId,
          userAId: identity.userId,
          userBId: 'social-user:lea' as EntityId,
          status: 'active' as const,
          createdAt: '2026-07-05T12:00:00.000Z',
          updatedAt: '2026-07-05T12:00:00.000Z',
        }],
        profiles: [{
          userId: 'social-user:lea' as EntityId,
          handle: 'lea.cardio',
          displayName: 'Léa Cardio',
          createdAt: '2026-07-05T12:00:00.000Z',
          updatedAt: '2026-07-05T12:00:00.000Z',
        }],
      })),
      listPermissionsWithStatus: vi.fn(async () => ({
        status: 'synchronized' as const,
        permissions: [],
      })),
    };

    render(
      <FriendsPrivacyPage
        repository={repository}
        identityRepository={identityRepository}
        socialFriendsGateway={socialFriendsGateway}
      />,
    );

    expect((await screen.findAllByText('Partage : Résumé')).length).toBeGreaterThan(0);
    await waitFor(() => expect(repository.saveSnapshot).toHaveBeenCalledOnce());
    expect(vi.mocked(repository.saveSnapshot).mock.calls[0]?.[0]).toMatchObject({
      activityPermissions: [expect.objectContaining({
        friendUserId: 'social-user:lea',
        sharingLevel: 'summary',
      })],
    });
  });

  it('ignore la réponse obsolète d’une permission remplacée immédiatement', async () => {
    const user = userEvent.setup();
    let resolveFirst: ((value: Awaited<ReturnType<SocialCloudFriendPermissionPort['savePermission']>>) => void) | undefined;
    let callCount = 0;
    const savePermission = vi.fn(async (_userId: EntityId, permission: Parameters<SocialCloudFriendPermissionPort['savePermission']>[1]) => {
      callCount += 1;
      if (callCount === 1) {
        return new Promise<Awaited<ReturnType<SocialCloudFriendPermissionPort['savePermission']>>>((resolve) => {
          resolveFirst = resolve;
        });
      }
      return {
        status: 'updated' as const,
        value: permission,
        message: 'Résumé confirmé.',
      };
    });
    const socialFriendsGateway: SocialFriendsGateway = {
      friendshipPort: {
        listFriendships: vi.fn(async () => []),
        upsertFriendship: vi.fn(async () => ({
          status: 'unavailable' as const,
          message: 'Non utilisé.',
        })),
      },
      permissionPort: {
        listPermissions: vi.fn(async () => []),
        savePermission,
      },
      listFriendshipsWithProfiles: vi.fn(async () => ({
        status: 'synchronized' as const,
        friendships: [],
        profiles: [],
      })),
    };

    renderPage({ socialFriendsGateway });
    await user.click(screen.getByText('Gérer'));
    await user.click(screen.getByRole('button', { name: 'Personnalisé' }));
    await user.click(screen.getByRole('button', { name: 'Résumé' }));

    await waitFor(() => expect(savePermission).toHaveBeenCalledTimes(2));
    expect((await screen.findAllByText('Partage : Résumé')).length).toBeGreaterThan(0);

    resolveFirst?.({
      status: 'unavailable',
      message: 'Ancienne requête hors ligne.',
    });
    await waitFor(() => expect(screen.getAllByText('Partage : Résumé').length).toBeGreaterThan(0));
    expect(screen.queryByText('Ancienne requête hors ligne.')).not.toBeInTheDocument();
  });
});
