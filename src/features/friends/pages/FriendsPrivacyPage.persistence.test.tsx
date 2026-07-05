import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { EntityId } from '@/domain/models/common';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';
import { DEFAULT_FRIENDS_PRIVACY_SETTINGS, type FriendsPrivacySnapshot } from '@/domain/friends/friendship';
import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';
import { createFoundSocialUserLookupGateway } from '@/application/friends/socialIdentityService';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';

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
  it('charge le snapshot depuis le dépôt et persiste une demande réelle trouvée par recherche exacte', async () => {
    const user = userEvent.setup();
    const repository = createMemoryRepository({
      friends: [],
      requests: [],
      privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
    });
    const identity = createDefaultSocialIdentity('2026-07-05T10:00:00.000Z', 'alex123');

    render(
      <FriendsPrivacyPage
        repository={repository}
        initialIdentity={identity}
        lookupGateway={createFoundSocialUserLookupGateway([
          {
            userId: 'social-user:romain' as EntityId,
            handle: 'romain.run',
            displayName: 'Romain Run',
            createdAt: '2026-07-05T09:00:00.000Z',
            updatedAt: '2026-07-05T09:00:00.000Z',
          },
        ])}
      />,
    );

    expect(await screen.findByText(/Aucun ami enregistré/u)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Identifiant SportPilot'), '@romain.run');
    await user.click(screen.getByRole('button', { name: /Envoyer/u }));

    await waitFor(() => expect(repository.saved).toHaveLength(1));
    expect(repository.saved[0]?.requests).toEqual([
      expect.objectContaining({
        requesterUserId: identity.userId,
        recipientUserId: 'social-user:romain',
        handle: 'romain.run',
        direction: 'outgoing',
      }),
    ]);
  });
});
