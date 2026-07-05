import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EntityId } from '@/domain/models/common';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';
import { createFoundSocialUserLookupGateway, type SocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';

const snapshot: FriendsPrivacySnapshot = {
  friends: [
    {
      id: 'friend:lea' as EntityId,
      displayName: 'Léa Cardio',
      handle: 'lea.cardio',
      initials: 'LC',
    },
  ],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  requests: [
    {
      id: 'request:nora' as EntityId,
      displayName: 'Nora Trail',
      handle: 'nora.trail',
      direction: 'incoming',
      status: 'pending',
      requestedAt: '2026-07-05T00:00:00.000Z',
    },
    {
      id: 'request:mathis' as EntityId,
      displayName: 'Mathis Run',
      handle: 'mathis.run',
      direction: 'outgoing',
      status: 'pending',
      requestedAt: '2026-07-04T00:00:00.000Z',
    },
  ],
};

const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'alex123');

function renderPage(override: { readonly lookupGateway?: SocialUserLookupGateway } = {}) {
  return render(<FriendsPrivacyPage initialSnapshot={snapshot} initialIdentity={identity} {...override} />);
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
    expect(screen.getByText(/Aucun export social détaillé n’est disponible en 0\.27\.0 F1/u)).toBeInTheDocument();
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

  it('envoie une demande sortante et bloque les doublons', async () => {
    const user = userEvent.setup();
    render(<FriendsPrivacyPage initialSnapshot={{ ...snapshot, requests: [] }} initialIdentity={identity} />);

    await user.type(screen.getByLabelText('Identifiant ami'), '@romain.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    expect(screen.getByText(/Demande envoyée/u)).toBeInTheDocument();
    expect(screen.getAllByText(/@romain\.run/u)).toHaveLength(2);
  });

  it('choisit le niveau détaillé sans autoriser l’export social détaillé', async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole('button', { name: 'Détaillé après accord' }));

    expect(screen.getAllByText(/Partage détaillé préparé/u)).toHaveLength(2);
    expect(screen.getAllByText(/bloqué jusqu’au consentement explicite/u)).toHaveLength(2);
    expect(screen.getByText(/Aucun export social détaillé/u)).toBeInTheDocument();
  });
});
