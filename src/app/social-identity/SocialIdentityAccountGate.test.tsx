import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialIdentityAccountGate } from '@/app/social-identity/SocialIdentityAccountGate';
import {
  createAccountSocialIdentityCandidate,
  createDefaultSocialIdentity,
  updateSocialIdentity,
} from '@/domain/friends/socialIdentity';

const accountUserId = 'dexie-user-123';
const defaultIdentity = createDefaultSocialIdentity('2026-07-09T10:00:00.000Z', 'browser');
const completeIdentity = createAccountSocialIdentityCandidate(
  defaultIdentity,
  accountUserId,
  { handle: 'alex.run', displayName: 'Alex Trail' },
  '2026-07-09T11:00:00.000Z',
);

function credentialsClient() {
  return {
    getCloudCredentials: () => ({ userId: accountUserId, accessToken: 'token' }),
    logout: vi.fn(async () => undefined),
  };
}

describe('SocialIdentityAccountGate', () => {
  it('laisse le mode local accéder directement à l’application', () => {
    render(
      <SocialIdentityAccountGate accountRequired={false}>
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(screen.getByText('Application prête')).toBeInTheDocument();
  });

  it('laisse un compte déjà confirmé fonctionner hors ligne', async () => {
    const readCurrentIdentity = vi.fn(async () => undefined);

    render(
      <SocialIdentityAccountGate
        accountRequired
        client={credentialsClient()}
        cloudPort={{
          readCurrentIdentity,
          lookupByHandle: vi.fn(),
          publishIdentity: vi.fn(),
        }}
        repository={{
          readIdentity: vi.fn(async () => completeIdentity),
          saveIdentity: vi.fn(),
        }}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(await screen.findByText('Application prête')).toBeInTheDocument();
    expect(readCurrentIdentity).toHaveBeenCalledWith(accountUserId);
  });

  it('restaure une identité cloud existante sur un nouvel appareil', async () => {
    const saveIdentity = vi.fn();

    render(
      <SocialIdentityAccountGate
        accountRequired
        client={credentialsClient()}
        cloudPort={{
          readCurrentIdentity: vi.fn(async () => completeIdentity),
          lookupByHandle: vi.fn(),
          publishIdentity: vi.fn(),
        }}
        repository={{
          readIdentity: vi.fn(async () => defaultIdentity),
          saveIdentity,
        }}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(await screen.findByText('Application prête')).toBeInTheDocument();
    expect(saveIdentity).toHaveBeenCalledWith(completeIdentity);
  });

  it('réconcilie une identité personnalisée ancienne vers le compte connecté', async () => {
    const legacyIdentity = updateSocialIdentity(
      defaultIdentity,
      { handle: 'alex.run', displayName: 'Alex Trail' },
      '2026-07-09T10:30:00.000Z',
    );
    const reconcileIdentity = vi.fn(async () => ({
      status: 'reconciled' as const,
      identity: completeIdentity,
      migratedUserIds: [legacyIdentity.userId],
      message: 'Identité réconciliée.',
    }));

    render(
      <SocialIdentityAccountGate
        accountRequired
        client={credentialsClient()}
        cloudPort={{
          readCurrentIdentity: vi.fn(async () => undefined),
          lookupByHandle: vi.fn(),
          publishIdentity: vi.fn(),
        }}
        reconcileIdentity={reconcileIdentity}
        repository={{
          readIdentity: vi.fn(async () => legacyIdentity),
          saveIdentity: vi.fn(),
        }}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(await screen.findByText('Application prête')).toBeInTheDocument();
    expect(reconcileIdentity).toHaveBeenCalledWith(legacyIdentity, expect.any(Object));
  });

  it('permet de revenir en mode local si la session du compte est indisponible', async () => {
    const user = userEvent.setup();
    const logout = vi.fn(async () => undefined);
    const activateGuest = vi.fn();
    const reload = vi.fn();

    render(
      <SocialIdentityAccountGate
        accountRequired
        activateGuest={activateGuest}
        client={{ getCloudCredentials: () => undefined, logout }}
        cloudPort={{
          readCurrentIdentity: vi.fn(),
          lookupByHandle: vi.fn(),
          publishIdentity: vi.fn(),
        }}
        reload={reload}
        repository={{
          readIdentity: vi.fn(async () => defaultIdentity),
          saveIdentity: vi.fn(),
        }}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    await user.click(await screen.findByRole('button', { name: 'Revenir au mode local' }));

    expect(logout).toHaveBeenCalledTimes(1);
    expect(activateGuest).toHaveBeenCalledTimes(1);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it('bloque un compte avec identité générée jusqu’à la réservation', async () => {
    const user = userEvent.setup();

    render(
      <SocialIdentityAccountGate
        accountRequired
        client={credentialsClient()}
        cloudPort={{
          readCurrentIdentity: vi.fn(async () => undefined),
          async lookupByHandle() {
            return { status: 'notFound' as const };
          },
          async publishIdentity(identity) {
            return {
              status: 'created' as const,
              value: identity,
              message: 'Réservé.',
            };
          },
        }}
        repository={{
          readIdentity: vi.fn(async () => defaultIdentity),
          saveIdentity: vi.fn(),
        }}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(await screen.findByRole('heading', { name: 'Choisir ton pseudonyme SportPilot' })).toBeInTheDocument();
    expect(screen.queryByText('Application prête')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Pseudonyme public unique/), 'alex.run');
    await user.click(screen.getByRole('button', { name: 'Réserver et continuer' }));

    await waitFor(() => expect(screen.getByText('Application prête')).toBeInTheDocument());
  });
});
