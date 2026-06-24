import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { ProfileContext } from '@/app/providers/profile/ProfileContext';
import { ProfilePage } from '@/features/profile/pages/ProfilePage';
import { createProfileInput } from '@/test/factories/profileFactory';

const storedProfile = {
  ...createProfileInput(),
  id: 'profile-1',
  createdAt: '2026-06-24T10:00:00.000Z',
  updatedAt: '2026-06-24T10:00:00.000Z',
};

afterEach(cleanup);

describe('ProfilePage', () => {
  it('permet de modifier et enregistrer le profil', async () => {
    const user = userEvent.setup();
    const saveProfile = vi.fn().mockResolvedValue(storedProfile);

    render(
      <ProfileContext.Provider
        value={{
          status: 'ready',
          profile: storedProfile,
          errorMessage: undefined,
          saveProfile,
          clearProfile: vi.fn(),
          refreshProfile: vi.fn(),
        }}
      >
        <ProfilePage />
      </ProfileContext.Provider>,
    );

    const firstNameInput = screen.getByLabelText('Prénom');
    await user.clear(firstNameInput);
    await user.type(firstNameInput, 'Axel mobile');
    await user.click(screen.getByRole('button', { name: 'Enregistrer le profil' }));

    expect(saveProfile).toHaveBeenCalledWith(
      expect.objectContaining({ firstName: 'Axel mobile' }),
    );
    expect(await screen.findByText('Le profil a été mis à jour dans la base locale.')).toBeInTheDocument();
  });

  it('limite le contenu et la carte pour éviter le débordement horizontal', () => {
    const { container } = render(
      <ProfileContext.Provider
        value={{
          status: 'ready',
          profile: storedProfile,
          errorMessage: undefined,
          saveProfile: vi.fn(),
          clearProfile: vi.fn(),
          refreshProfile: vi.fn(),
        }}
      >
        <ProfilePage />
      </ProfileContext.Provider>,
    );

    expect(container.querySelector('section')).toHaveClass('min-w-0', 'overflow-x-clip');
    expect(screen.getByLabelText(/Taille en centimètres/)).toHaveClass('max-w-full');
  });
});
