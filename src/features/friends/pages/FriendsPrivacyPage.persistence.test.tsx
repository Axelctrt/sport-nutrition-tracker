import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';

function createMemoryRepository(initial: FriendsPrivacySnapshot): FriendsPrivacySnapshotRepository & {
  saved: FriendsPrivacySnapshot[];
} {
  const saved: FriendsPrivacySnapshot[] = [];
  let current = initial;

  return {
    saved,
    readSnapshot: async () => current,
    saveSnapshot: async (snapshot) => {
      current = snapshot;
      saved.push(snapshot);
    },
  };
}

describe('FriendsPrivacyPage persistance locale', () => {
  it('charge le snapshot depuis le dépôt et persiste les changements', async () => {
    const user = userEvent.setup();
    const repository = createMemoryRepository({
      friends: [],
      requests: [],
      privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    });

    render(<FriendsPrivacyPage repository={repository} />);

    expect(await screen.findByText(/Aucun ami enregistré/u)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Identifiant ami'), '@romain.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    await waitFor(() => expect(repository.saved).toHaveLength(1));
    expect(repository.saved[0]?.requests).toEqual([
      expect.objectContaining({ handle: 'romain.run', direction: 'outgoing' }),
    ]);
  });
});
