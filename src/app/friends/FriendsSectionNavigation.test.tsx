import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FriendsSectionNavigation } from '@/app/friends/FriendsSectionNavigation';

describe('FriendsSectionNavigation', () => {
  it('affiche Profil tout en conservant le nom accessible complet et la navigation', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FriendsSectionNavigation
        activeSection="feed"
        incomingRequestCount={0}
        onSelect={onSelect}
      />,
    );

    const profileButton = screen.getByRole('button', { name: 'Mon profil social' });
    expect(within(profileButton).getByText('Profil', { exact: true })).toBeInTheDocument();
    expect(within(profileButton).queryByText('Mon profil', { exact: true })).not.toBeInTheDocument();

    await user.click(profileButton);
    expect(onSelect).toHaveBeenCalledWith('profile');
  });
});
