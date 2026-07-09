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

    expect(screen.getByLabelText('Nom affiché publiquement')).toHaveValue('');
    await user.type(screen.getByLabelText(/Pseudonyme public unique/), 'alex.run');
    await user.type(screen.getByLabelText('Nom affiché publiquement'), 'Alex Trail');
    await user.click(screen.getByRole('button', { name: 'Réserver et continuer' }));

    expect(saveIdentity).toHaveBeenCalledWith(expect.objectContaining({
      userId: 'dexie-user-123',
      handle: 'alex.run',
      displayName: 'Alex Trail',
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

    await user.type(screen.getByLabelText(/Pseudonyme public unique/), 'alex.run');
    await user.click(screen.getByRole('button', { name: 'Réserver et continuer' }));

    expect(await screen.findByText('Identifiant déjà pris.')).toBeInTheDocument();
    expect(saveIdentity).not.toHaveBeenCalled();
  });
});
