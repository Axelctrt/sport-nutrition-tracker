import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { FriendsPrivacySnapshotRepository } from '@/application/friends/friendsPrivacyService';
import { SocialProfileVisibilityNotifier } from '@/app/friends/SocialProfileVisibilityNotifier';
import {
  DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  type FriendsPrivacySnapshot,
} from '@/domain/friends/friendship';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';
import { FriendsPrivacyPage } from '@/features/friends/pages/FriendsPrivacyPage';
import { ToastProvider } from '@/shared/toast/ToastProvider';

const snapshot: FriendsPrivacySnapshot = {
  friends: [],
  requests: [],
  privacy: DEFAULT_FRIENDS_PRIVACY_SETTINGS,
  activityPermissions: [],
};

const identity = createDefaultSocialIdentity(
  '2026-07-10T08:00:00.000Z',
  'alex123',
);

function renderVisibilityPage(repository: FriendsPrivacySnapshotRepository) {
  return render(
    <ToastProvider>
      <SocialProfileVisibilityNotifier />
      <FriendsPrivacyPage
        initialSnapshot={snapshot}
        initialIdentity={identity}
        repository={repository}
      />
    </ToastProvider>,
  );
}

beforeEach(() => {
  window.history.replaceState({}, '', '/#/friends');
});

afterEach(() => {
  cleanup();
});

describe('feedback de visibilité du profil', () => {
  it('affiche un toast unique après persistance sans notice verte locale', async () => {
    const user = userEvent.setup();
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => snapshot),
      saveSnapshot: vi.fn(async () => undefined),
    };
    renderVisibilityPage(repository);

    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
    await user.click(screen.getByRole('radio', { name: 'Profil privé' }));

    await waitFor(() => expect(repository.saveSnapshot).toHaveBeenCalledOnce());
    expect(await screen.findByText('Visibilité du profil mise à jour')).toBeInTheDocument();
    expect(screen.getAllByText('Visibilité du profil mise à jour')).toHaveLength(1);
    expect(screen.queryByText('Action prise en compte')).not.toBeInTheDocument();
    expect(screen.queryByText(/Profil passé en privé/u)).not.toBeInTheDocument();
  });

  it('conserve une erreur locale sans toast lorsque la persistance échoue', async () => {
    const user = userEvent.setup();
    const repository: FriendsPrivacySnapshotRepository = {
      readSnapshot: vi.fn(async () => snapshot),
      saveSnapshot: vi.fn(async () => {
        throw new Error('Stockage local indisponible.');
      }),
    };
    renderVisibilityPage(repository);

    await user.click(screen.getByRole('button', { name: 'Mon profil social' }));
    await user.click(screen.getByRole('radio', { name: 'Profil public' }));

    expect(await screen.findByText('Stockage local indisponible.')).toBeInTheDocument();
    expect(screen.queryByText('Visibilité du profil mise à jour')).not.toBeInTheDocument();
    expect(screen.queryByText('Action prise en compte')).not.toBeInTheDocument();
  });
});
