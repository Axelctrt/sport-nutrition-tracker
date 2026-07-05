import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EntityId } from '@/domain/models/common';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
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

describe('FriendsPrivacyPage', () => {
  it('affiche le socle amis, les demandes et les réglages de confidentialité', () => {
    render(<FriendsPrivacyPage initialSnapshot={snapshot} />);

    expect(screen.getByRole('heading', { name: 'Amis et confidentialité' })).toBeInTheDocument();
    expect(screen.getByText('Léa Cardio')).toBeInTheDocument();
    expect(screen.getByText('Nora Trail')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partage désactivé' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/Les données détaillées restent privées/u)).toBeInTheDocument();
    expect(screen.getByText('Garde-fou social actif')).toBeInTheDocument();
    expect(screen.getByText(/Aucun export social détaillé n’est disponible en 0\.26\.0/u)).toBeInTheDocument();
  });

  it('accepte une demande reçue sans activer le partage détaillé', async () => {
    const user = userEvent.setup();
    render(<FriendsPrivacyPage initialSnapshot={snapshot} />);

    await user.click(screen.getByRole('button', { name: /Accepter/u }));

    expect(screen.getByText(/Demande acceptée/u)).toBeInTheDocument();
    expect(screen.getByText(/2 amis/u)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Partage désactivé' })).toHaveAttribute('aria-pressed', 'true');
  });

  it('envoie une demande sortante et bloque les doublons', async () => {
    const user = userEvent.setup();
    render(<FriendsPrivacyPage initialSnapshot={{ ...snapshot, requests: [] }} />);

    await user.type(screen.getByLabelText('Identifiant ami'), '@romain.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    expect(screen.getByText(/Demande envoyée/u)).toBeInTheDocument();
    expect(screen.getAllByText(/@romain\.run/u)).toHaveLength(2);
  });


  it('choisit le niveau détaillé sans autoriser l’export social détaillé', async () => {
    const user = userEvent.setup();
    render(<FriendsPrivacyPage initialSnapshot={snapshot} />);

    await user.click(screen.getByRole('button', { name: 'Détaillé après accord' }));

    expect(screen.getAllByText(/Partage détaillé préparé/u)).toHaveLength(2);
    expect(screen.getAllByText(/bloqué jusqu’au consentement explicite/u)).toHaveLength(2);
    expect(screen.getByText(/Aucun export social détaillé/u)).toBeInTheDocument();
  });
});
