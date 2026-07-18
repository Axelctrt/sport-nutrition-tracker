import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { OnboardingSocialIdentity } from '@/features/onboarding/components/OnboardingSocialIdentity';
import { createDefaultSocialIdentity } from '@/domain/friends/socialIdentity';

const initialIdentity = createDefaultSocialIdentity('2026-07-09T10:00:00.000Z', 'browser');

describe('OnboardingSocialIdentity', () => {
  it('ne préremplit jamais le prénom réel et réserve avant de continuer', async () => {
    const user = userEvent.setup();
    const saveIdentity = vi.fn();
    const onCompleted = vi.fn();

    render(
      <OnboardingSocialIdentity
        accountUserId="dexie-user-123"
        cloudPort={{
          async lookupByHandle() {
            return { status: 'notFound' };
          },
          async publishIdentity(identity) {
            return {
              status: 'created',
              value: identity,
              message: 'Identifiant réservé.',
            };
          },
        }}
        initialIdentity={initialIdentity}
        onCompleted={onCompleted}
        repository={{
          readIdentity: vi.fn(async () => initialIdentity),
          saveIdentity,
        }}
      />,
    );

    expect(screen.getByRole('heading', { name: 'Votre identité sociale' })).toBeInTheDocument();
    expect(document.querySelector('main')).toHaveClass('fixed', 'h-[100dvh]', 'overflow-hidden');
    expect(screen.queryByText(/réservation est effectuée côté serveur/i)).not.toBeInTheDocument();
    expect(screen.getByLabelText('Nom affiché')).toHaveValue('');
    expect(document.querySelector('main')).toHaveClass('fixed', 'h-[100dvh]', 'overflow-hidden');
    expect(screen.getByPlaceholderText('axel_aka_dieu')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Axel le Dieu')).toBeInTheDocument();
    await user.type(screen.getByLabelText(/Identifiant public/), 'axel_aka_dieu');
    await user.type(screen.getByLabelText('Nom affiché'), 'Axel le Dieu');
    await user.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }));

    expect(saveIdentity).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'dexie-user-123',
      handle: 'axel_aka_dieu',
      displayName: 'Axel le Dieu',
    }));
    expect(onCompleted).toHaveBeenCalledTimes(1);
  });

  it('conserve l’identité locale précédente en cas de conflit', async () => {
    const user = userEvent.setup();
    const saveIdentity = vi.fn();

    render(
      <OnboardingSocialIdentity
        accountUserId="dexie-user-123"
        cloudPort={{
          async lookupByHandle() {
            return { status: 'notFound' };
          },
          async publishIdentity() {
            return {
              status: 'conflict',
              message: 'Identifiant déjà pris.',
            };
          },
        }}
        initialIdentity={initialIdentity}
        onCompleted={vi.fn()}
        repository={{
          readIdentity: vi.fn(async () => initialIdentity),
          saveIdentity,
        }}
      />,
    );

    await user.type(screen.getByLabelText(/Identifiant public/), 'axel_aka_dieu');
    await user.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }));

    expect(await screen.findByText('Identifiant déjà pris.')).toBeInTheDocument();
    expect(saveIdentity).not.toHaveBeenCalled();
  });
});
