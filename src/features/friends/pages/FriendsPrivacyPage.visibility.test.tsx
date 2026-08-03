import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import type { FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS } from '@/domain/friends/friendship';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';
import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';

const snapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  activityPermissions: [],
};

const identity = createDefaultSocialIdentity('2026-08-03T08:00:00.000Z', 'alex123');

function renderProfile(repository: FriendsPrivacySnapshotRepository) {
  return render(
    <FriendsPrivacyPage
      initialSnapshot={snapshot}
      initialIdentity={identity}
      repository={repository}
    />,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/#/friends');
});

describe('FriendsPrivacyPage visibility feedback', () => {
  it('conserve un toast unique et aucune notice verte persistante après succès', async () => {
    const user = userEvent.setup();
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => snapshot),
      saveSnapshot: vi.fn(async () => undefined),
    };
    renderProfile(repository);

    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
    await user.click(screen.getByRole('radio', { name: 'Profil privé' }));

    await waitFor(() => expect(repository.saveSnapshot).toHaveBeenCalled());
    const persistedSnapshot = vi.mocked(repository.saveSnapshot).mock.calls.at(-1)?.[0];
    expect(persistedSnapshot).toMatchObject({
      privacy: { profileVisibility: 'private' },
    });
    expect(persistedSnapshot).not.toHaveProperty('lastFeedback');
    expect(screen.queryByText('Action prise en compte')).not.toBeInTheDocument();
    expect(screen.queryByText(/Profil passé en privé/u)).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: 'Enregistrer' }));
    expect(await screen.findByText('Profil mis à jour')).toBeInTheDocument();
    expect(screen.getAllByText('Profil mis à jour')).toHaveLength(1);
    expect(screen.queryByText('Action prise en compte')).not.toBeInTheDocument();
  });

  it('affiche uniquement une erreur locale lorsque la visibilité ne peut pas être sauvegardée', async () => {
    const user = userEvent.setup();
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => snapshot),
      saveSnapshot: vi.fn(async () => {
        throw new Error('Stockage social indisponible.');
      }),
    };
    renderProfile(repository);

    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
    await user.click(screen.getByRole('radio', { name: 'Profil privé' }));

    expect(await screen.findByText('Stockage social indisponible.')).toBeInTheDocument();
    expect(screen.queryByText('Profil mis à jour')).not.toBeInTheDocument();
    expect(screen.queryByText('Action prise en compte')).not.toBeInTheDocument();
    expect(screen.queryByText(/Profil passé en privé/u)).not.toBeInTheDocument();
  });
});
