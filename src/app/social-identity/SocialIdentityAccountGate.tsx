import { useEffect, useMemo, useState, type PropsWithChildren } from 'react';
import { routePaths } from '@/app/routePaths';
import { CloudAccountAccessError } from '@/application/account/cloudAccountAccess';
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
  readonly currentPathname?: string;
  readonly repository?: SocialIdentityRepository;
  readonly cloudPort?: Pick<
    SocialCloudIdentityPort,
    'lookupByHandle' | 'publishIdentity' | 'readCurrentIdentity'
  >;
  readonly client?: Pick<
    SyncPrototypeClient,
    'getCloudCredentials' | 'ensureValidCloudCredentials'
  >;
  readonly reconcileIdentity?: (
    identity: SocialIdentity,
    repository: SocialIdentityRepository,
  ) => Promise<SocialIdentityReconciliationResult>;
  readonly navigateToReconnect?: () => void;
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

function runtimeClient(): Pick<
  SyncPrototypeClient,
  'getCloudCredentials' | 'ensureValidCloudCredentials'
> | undefined {
  try {
    return getSyncPrototypeClient();
  } catch {
    return undefined;
  }
}

function defaultNavigateToReconnect(): void {
  window.location.hash = routePaths.syncPrototype;
}

function runtimePathname(): string {
  if (typeof window === 'undefined') return routePaths.dashboard;
  const hashPath = window.location.hash.replace(/^#/, '').split('?')[0];
  return hashPath || window.location.pathname || routePaths.dashboard;
}

function socialSetupIsRequired(pathname: string): boolean {
  return pathname === routePaths.friends || pathname.startsWith(`${routePaths.friends}/`);
}

export function SocialIdentityAccountGate({
  children,
  accountRequired = activeDataSpace.kind === 'account',
  currentPathname,
  repository: injectedRepository,
  cloudPort: injectedCloudPort,
  client: injectedClient,
  reconcileIdentity,
  navigateToReconnect = defaultNavigateToReconnect,
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
  const [routerPathname, setRouterPathname] = useState(runtimePathname);
  const pathname = currentPathname ?? routerPathname;
  const setupRequired = accountRequired && socialSetupIsRequired(pathname);
  const [state, setState] = useState<GateState>(() => (
    setupRequired ? { status: 'loading' } : { status: 'ready' }
  ));

  useEffect(() => {
    if (currentPathname !== undefined) return undefined;
    const syncPathname = () => setRouterPathname(runtimePathname());
    window.addEventListener('hashchange', syncPathname);
    return () => window.removeEventListener('hashchange', syncPathname);
  }, [currentPathname]);

  useEffect(() => {
    if (!setupRequired) {
      setState({ status: 'ready' });
      return undefined;
    }

    let active = true;
    setState({ status: 'loading' });

    void (async () => {
      const credentials = client?.ensureValidCloudCredentials
        ? await client.ensureValidCloudCredentials()
        : client?.getCloudCredentials?.();
      if (!credentials?.userId.trim() || !credentials.accessToken.trim()) {
        throw new CloudAccountAccessError(
          'SESSION_EXPIRED',
          'La session du compte doit être renouvelée.',
        );
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
          setState(setupRequired
            ? {
                status: 'setup',
                accountUserId,
                identity: localIdentity,
                message: reconciliation.message,
              }
            : { status: 'ready' });
        }
        return;
      }

      if (active) {
        setState(setupRequired
          ? {
              status: 'setup',
              accountUserId,
              identity: localIdentity,
            }
          : { status: 'ready' });
      }
    })().catch((error: unknown) => {
      if (!active) return;
      if (
        error instanceof CloudAccountAccessError
        && ['NETWORK_OFFLINE', 'CLOUD_UNAVAILABLE'].includes(error.code)
      ) {
        setState({ status: 'ready' });
        return;
      }
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
  }, [client, cloudPort, reconcileIdentity, repository, setupRequired]);

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
        title="Restauration de la session…"
        description="SportPilot prépare l’accès à la rubrique Amis."
      />
    );
  }

  if (state.status === 'error') {
    return (
      <main className="grid min-h-screen place-items-center px-4 py-8">
        <Card className="w-full max-w-xl p-5 sm:p-7">
          <InlineNotice tone="warning" title="Reconnexion requise">
            {state.message}
          </InlineNotice>
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <Button onClick={navigateToReconnect}>
              Se reconnecter
            </Button>
            <Button onClick={() => setState({ status: 'ready' })} variant="secondary">
              Continuer hors ligne
            </Button>
          </div>
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
        onUseLocal={() => setState({ status: 'ready' })}
        repository={repository}
      />
    </>
  );
}
