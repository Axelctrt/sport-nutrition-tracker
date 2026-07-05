import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EntityId } from '@/domain/models/common';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  updateFriendActivityPermission,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';
import type { SocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshot';
import { createFoundSocialUserLookupGateway, type SocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';

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
  readonly initialSnapshot?: FriendsPrivacySnapshot;
  readonly initialActivitySnapshots?: readonly SocialActivitySnapshot[];
} = {}) {
  const pageProps = {
    initialSnapshot: override.initialSnapshot ?? snapshot,
    initialIdentity: identity,
    ...(override.lookupGateway ? { lookupGateway: override.lookupGateway } : {}),
    ...(override.initialActivitySnapshots ? { initialActivitySnapshots: override.initialActivitySnapshots } : {}),
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
    expect(screen.getByText('Garde-fou social actif')).toBeInTheDocument();
    expect(screen.getByText(/Snapshots sociaux F4 actifs/u)).toBeInTheDocument();
    expect(screen.getByText('Fil d’activité amis F5 actif')).toBeInTheDocument();
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

    expect(screen.getByText(/Demande acceptée/u)).toBeInTheDocument();
    expect(screen.getByText(/2 amis/u)).toBeInTheDocument();
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

    expect(screen.getByRole('button', { name: 'Autoriser le détail' })).toBeDisabled();

    await user.click(screen.getByRole('button', { name: 'Détaillé après accord' }));
    await user.click(screen.getByRole('button', { name: 'Autoriser le détail' }));

    expect(screen.getByText(/Consentement détaillé enregistré pour cet ami/u)).toBeInTheDocument();
    expect(screen.getByText(/Permission : Détail autorisé/u)).toBeInTheDocument();
    expect(screen.getByText(/Détail autorisé localement pour cet ami/u)).toBeInTheDocument();
    expect(screen.getByText(/snapshots sociaux filtrés peuvent utiliser ce niveau/u)).toBeInTheDocument();
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
