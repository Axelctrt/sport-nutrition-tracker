import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SocialIdentityAccountGate } from '@/app/social-identity/SocialIdentityAccountGate';
import { routePaths } from '@/app/routePaths';
import { CloudAccountAccessError } from '@/application/account/cloudAccountAccess';
import { PROFILE_ONBOARDING_STEP_IDS } from '@/features/onboarding/profile/profileOnboardingSteps';
import {
  loadProfileOnboardingDraft,
  saveProfileOnboardingDraft,
} from '@/features/onboarding/storage/profileOnboardingDraft';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
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
  { handle: 'axel_aka_dieu', displayName: 'Alex Trail' },
  '2026-07-09T11:00:00.000Z',
);

function credentialsClient() {
  return {
    getCloudCredentials: () => ({ userId: accountUserId, accessToken: 'token' }),
    ensureValidCloudCredentials: vi.fn(async () => ({
      userId: accountUserId,
      accessToken: 'token',
    })),
  };
}

describe('SocialIdentityAccountGate', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it('laisse le mode local accéder directement à l’application', () => {
    render(
      <SocialIdentityAccountGate accountRequired={false}>
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(screen.getByText('Application prête')).toBeInTheDocument();
  });

  it('ne prépare pas l’identité sociale hors de la rubrique Amis', async () => {
    const readCurrentIdentity = vi.fn(async () => undefined);
    const client = credentialsClient();

    render(
      <SocialIdentityAccountGate
        accountRequired
        currentPathname={routePaths.dashboard}
        client={client}
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
    expect(readCurrentIdentity).not.toHaveBeenCalled();
    expect(client.ensureValidCloudCredentials).not.toHaveBeenCalled();
  });

  it('restaure une identité cloud existante sur un nouvel appareil', async () => {
    const saveIdentity = vi.fn();

    render(
      <SocialIdentityAccountGate
        accountRequired
        currentPathname={routePaths.friends}
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
      { handle: 'axel_aka_dieu', displayName: 'Alex Trail' },
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
        currentPathname={routePaths.friends}
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

  it('propose reconnexion ou continuation hors ligne sans déconnexion implicite', async () => {
    const user = userEvent.setup();
    const navigateToReconnect = vi.fn();
    const ensureValidCloudCredentials = vi.fn(async () => {
      throw new CloudAccountAccessError(
        'SESSION_EXPIRED',
        'La session a expiré.',
      );
    });

    render(
      <SocialIdentityAccountGate
        accountRequired
        currentPathname={routePaths.friends}
        client={{
          getCloudCredentials: () => undefined,
          ensureValidCloudCredentials,
        }}
        cloudPort={{
          readCurrentIdentity: vi.fn(),
          lookupByHandle: vi.fn(),
          publishIdentity: vi.fn(),
        }}
        navigateToReconnect={navigateToReconnect}
        repository={{
          readIdentity: vi.fn(async () => defaultIdentity),
          saveIdentity: vi.fn(),
        }}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(await screen.findByText('La session a expiré.')).toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: 'Se reconnecter' }));
    expect(navigateToReconnect).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole('button', { name: 'Continuer hors ligne' }));
    expect(screen.getByText('Application prête')).toBeInTheDocument();
    expect(ensureValidCloudCredentials).toHaveBeenCalledTimes(1);
  });

  it('laisse la rubrique Amis utiliser ses données locales pendant une panne réseau', async () => {
    const ensureValidCloudCredentials = vi.fn(async () => {
      throw new CloudAccountAccessError(
        'NETWORK_OFFLINE',
        'Aucune connexion réseau.',
      );
    });

    render(
      <SocialIdentityAccountGate
        accountRequired
        currentPathname={routePaths.friends}
        client={{
          getCloudCredentials: () => undefined,
          ensureValidCloudCredentials,
        }}
        cloudPort={{
          readCurrentIdentity: vi.fn(),
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
    expect(ensureValidCloudCredentials).toHaveBeenCalledTimes(1);
  });

  it('ne bloque pas l’application avec une identité générée hors de la rubrique Amis', async () => {
    render(
      <SocialIdentityAccountGate
        accountRequired
        currentPathname={routePaths.dashboard}
        client={credentialsClient()}
        cloudPort={{
          readCurrentIdentity: vi.fn(async () => undefined),
          lookupByHandle: vi.fn(),
          publishIdentity: vi.fn(),
        }}
        repository={{
          readIdentity: vi.fn(async () => defaultIdentity),
          saveIdentity: vi.fn(),
        }}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(await screen.findByText('Application prête')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Votre identité sociale' })).not.toBeInTheDocument();
  });

  it('demande l’identité générée à la première ouverture d’Amis puis reprend le formulaire au nom', async () => {
    const user = userEvent.setup();
    const resumeProfileOnboarding = vi.fn();
    saveProfileOnboardingDraft(
      { ...DEFAULT_PROFILE_FORM_VALUES, firstName: 'Profil conservé' },
      PROFILE_ONBOARDING_STEP_IDS.summary,
    );

    render(
      <SocialIdentityAccountGate
        accountRequired
        currentPathname={routePaths.friends}
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
        resumeProfileOnboarding={resumeProfileOnboarding}
      >
        <p>Application prête</p>
      </SocialIdentityAccountGate>,
    );

    expect(await screen.findByRole('heading', { name: 'Votre identité sociale' })).toBeInTheDocument();
    expect(screen.queryByText('Application prête')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Identifiant public/), 'axel_aka_dieu');
    await user.click(screen.getByRole('button', { name: 'Enregistrer et continuer' }));

    await waitFor(() => expect(screen.getByText('Application prête')).toBeInTheDocument());
    expect(resumeProfileOnboarding).toHaveBeenCalledTimes(1);
    const draft = loadProfileOnboardingDraft();
    expect(draft.status).toBe('restored');
    if (draft.status === 'restored') {
      expect(draft.draft.stepId).toBe(PROFILE_ONBOARDING_STEP_IDS.name);
      expect(draft.draft.values.firstName).toBe('Profil conservé');
    }
  });
});
