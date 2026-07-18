import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { routePaths } from '@/app/routePaths';
import type { SocialIdentityReconciliationResult } from '@/application/friends/socialIdentityReconciliationService';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';
import type { SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import {
  isAccountSocialIdentityComplete,
  isGeneratedDefaultSocialIdentity,
  type SocialIdentity,
} from '@/domain/friends/socialIdentity';
import { OnboardingSocialIdentity } from '@/features/onboarding/components/OnboardingSocialIdentity';
import { PROFILE_ONBOARDING_STEP_IDS } from '@/features/onboarding/profile/profileOnboardingSteps';
import { readProfileOnboardingCompletion } from '@/features/onboarding/storage/onboardingCompletionStorage';
import {
  loadProfileOnboardingDraft,
  saveProfileOnboardingDraft,
} from '@/features/onboarding/storage/profileOnboardingDraft';
import { DEFAULT_PROFILE_FORM_VALUES } from '@/features/profile/utils/defaultProfileFormValues';
import { activateGuestDataSpace } from '@/infrastructure/data-spaces/dataSpaceRegistry';
import { appDatabase, activeDataSpace } from '@/infrastructure/database/database';
import { DexieSocialIdentityRepository } from '@/infrastructure/repositories/dexie/DexieSocialIdentityRepository';
import { createRuntimeSocialCloudIdentityPort } from '@/infrastructure/sync-prototype/realSocialCloudIdentityService';
import { reconcileRuntimeSocialIdentity } from '@/infrastructure/sync-prototype/runtimeSocialIdentityReconciliation';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { CenteredState } from '@/shared/ui/CenteredState';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface SocialIdentityAccountGateProps extends PropsWithChildren {
  readonly accountRequired?: boolean;
  readonly repository?: SocialIdentityRepository;
  readonly cloudPort?: Pick<
    SocialCloudIdentityPort,
    'lookupByHandle' | 'publishIdentity' | 'readCurrentIdentity'
  >;
  readonly client?: Pick<SyncPrototypeClient, 'getCloudCredentials' | 'logout'>;
  readonly reconcileIdentity?: (
    identity: SocialIdentity,
    repository: SocialIdentityRepository,
  ) => Promise<SocialIdentityReconciliationResult>;
  readonly activateGuest?: () => void;
  readonly reload?: () => void;
  readonly resumeProfileOnboarding?: () => void;
}

type GateState =
  | { readonly status: 'loading' }
  | { readonly status: 'ready' }
  | {
      readonly status: 'setup';
      readonly accountUserId: string;
      readonly identity: SocialIdentity;
      readonly message?: string;
    }
  | { readonly status: 'error'; readonly message: string };

function defaultResumeProfileOnboarding(): void {
  const onboardingUrl = `${window.location.pathname}${window.location.search}#${routePaths.onboarding}`;
  window.location.replace(onboardingUrl);
}

function runtimeClient(): Pick<SyncPrototypeClient, 'getCloudCredentials' | 'logout'> | undefined {
  try {
    return getSyncPrototypeClient();
  } catch {
    return undefined;
  }
}

export function SocialIdentityAccountGate({
  children,
  accountRequired = activeDataSpace.kind === 'account',
  repository: injectedRepository,
  cloudPort: injectedCloudPort,
  client: injectedClient,
  reconcileIdentity,
  activateGuest = activateGuestDataSpace,
  reload = () => window.location.reload(),
  resumeProfileOnboarding = defaultResumeProfileOnboarding,
}: SocialIdentityAccountGateProps) {
  const repository = useMemo(
    () => injectedRepository ?? new DexieSocialIdentityRepository(appDatabase),
    [injectedRepository],
  );
  const cloudPort = useMemo(
    () => injectedCloudPort ?? createRuntimeSocialCloudIdentityPort(),
    [injectedCloudPort],
  );
  const client = useMemo(
    () => injectedClient ?? runtimeClient(),
    [injectedClient],
  );
  const [state, setState] = useState<GateState>(() => (
    accountRequired ? { status: 'loading' } : { status: 'ready' }
  ));

  useEffect(() => {
    if (!accountRequired) {
      setState({ status: 'ready' });
      return undefined;
    }

    let active = true;
    setState({ status: 'loading' });

    void (async () => {
      const credentials = client?.getCloudCredentials?.();
      if (!credentials?.userId.trim() || !credentials.accessToken.trim()) {
        if (active) {
          setState({
            status: 'error',
            message: 'La session du compte n’est pas disponible. Reconnecte le compte ou repasse en mode local.',
          });
        }
        return;
      }

      const accountUserId = credentials.userId.trim();
      const localIdentity = await repository.readIdentity();

      if (isAccountSocialIdentityComplete(localIdentity, accountUserId)) {
        if (active) setState({ status: 'ready' });
        void cloudPort.readCurrentIdentity(accountUserId)
          .then(async (cloudIdentity) => {
            if (
              cloudIdentity
              && isAccountSocialIdentityComplete(cloudIdentity, accountUserId)
              && (cloudIdentity.handle !== localIdentity.handle
                || cloudIdentity.displayName !== localIdentity.displayName
                || cloudIdentity.updatedAt !== localIdentity.updatedAt)
            ) {
              await repository.saveIdentity(cloudIdentity);
            }
          })
          .catch(() => undefined);
        return;
      }

      const cloudIdentity = await cloudPort.readCurrentIdentity(accountUserId).catch(() => undefined);
      if (cloudIdentity && isAccountSocialIdentityComplete(cloudIdentity, accountUserId)) {
        await repository.saveIdentity(cloudIdentity);
        if (active) setState({ status: 'ready' });
        return;
      }

      if (!isGeneratedDefaultSocialIdentity(localIdentity) && localIdentity.userId !== accountUserId) {
        const reconciliation = reconcileIdentity
          ? await reconcileIdentity(localIdentity, repository)
          : await reconcileRuntimeSocialIdentity({ identity: localIdentity, repository });

        if (
          ['reconciled', 'alreadyCanonical'].includes(reconciliation.status)
          && isAccountSocialIdentityComplete(reconciliation.identity, accountUserId)
        ) {
          if (active) setState({ status: 'ready' });
          return;
        }

        if (active) {
          setState({
            status: 'setup',
            accountUserId,
            identity: localIdentity,
            message: reconciliation.message,
          });
        }
        return;
      }

      if (active) {
        setState({
          status: 'setup',
          accountUserId,
          identity: localIdentity,
        });
      }
    })().catch((error: unknown) => {
      if (!active) return;
      setState({
        status: 'error',
        message: error instanceof Error
          ? error.message
          : 'L’identité sociale n’a pas pu être préparée.',
      });
    });

    return () => {
      active = false;
    };
  }, [accountRequired, client, cloudPort, reconcileIdentity, repository]);

  const handleUseLocalMode = async () => {
    await client?.logout();
    activateGuest();
    reload();
  };

  const handleIdentityCompleted = () => {
    if (!readProfileOnboardingCompletion()) {
      const restored = loadProfileOnboardingDraft();
      const values = restored.status === 'restored'
        ? restored.draft.values
        : DEFAULT_PROFILE_FORM_VALUES;
      const draftSaved = saveProfileOnboardingDraft(
        values,
        PROFILE_ONBOARDING_STEP_IDS.name,
      );

      if (!draftSaved) {
        setState({
          status: 'error',
          message: 'La reprise du formulaire de profil n’a pas pu être préparée.',
        });
        return;
      }

      setState({ status: 'ready' });
      resumeProfileOnboarding();
      return;
    }

    setState({ status: 'ready' });
  };

  if (state.status === 'ready') return children;

  if (state.status === 'loading') {
    return (
      <CenteredState
        title="Vérification de l’identité sociale"
        description="SportPilot vérifie le pseudonyme associé à ce compte."
      />
    );
  }

  if (state.status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <Card className="w-full max-w-xl p-5 sm:p-7">
          <InlineNotice tone="error" title="Identité sociale indisponible">
            {state.message}
          </InlineNotice>
          <Button className="mt-4 w-full" onClick={() => void handleUseLocalMode()} variant="secondary">
            Revenir au mode local
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <>
      {state.message ? (
        <p className="sr-only" role="status">{state.message}</p>
      ) : null}
      <OnboardingSocialIdentity
        accountUserId={state.accountUserId}
        cloudPort={cloudPort}
        initialIdentity={state.identity}
        {...(state.message ? { initialNotice: state.message } : {})}
        onCompleted={handleIdentityCompleted}
        onUseLocal={handleUseLocalMode}
        repository={repository}
      />
    </>
  );
}
