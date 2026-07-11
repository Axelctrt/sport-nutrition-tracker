import { AtSign, CheckCircle2, Cloud, LockKeyhole, RefreshCw } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import {
  checkAccountSocialHandleAvailability,
  provisionAccountSocialIdentity,
} from '@/application/friends/accountSocialIdentityService';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';
import type { SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import {
  formatSocialHandle,
  isGeneratedDefaultSocialIdentity,
  validateSocialHandle,
  type SocialIdentity,
  type SocialIdentityAvailabilityResult,
} from '@/domain/friends/socialIdentity';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface OnboardingSocialIdentityProps {
  readonly accountUserId: string;
  readonly initialIdentity: SocialIdentity;
  readonly repository: SocialIdentityRepository;
  readonly cloudPort: Pick<SocialCloudIdentityPort, 'lookupByHandle' | 'publishIdentity'>;
  readonly onCompleted: (identity: SocialIdentity) => void;
  readonly onUseLocal?: () => void | Promise<void>;
  readonly initialNotice?: string;
}

const idleAvailability: SocialIdentityAvailabilityResult = {
  status: 'idle',
  message: 'Vérifie la disponibilité ou enregistre directement : la réservation finale reste atomique.',
};

const inputClasses =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export function OnboardingSocialIdentity({
  accountUserId,
  initialIdentity,
  repository,
  cloudPort,
  onCompleted,
  onUseLocal,
  initialNotice,
}: OnboardingSocialIdentityProps) {
  const generatedIdentity = isGeneratedDefaultSocialIdentity(initialIdentity);
  const [handle, setHandle] = useState(generatedIdentity ? '' : formatSocialHandle(initialIdentity.handle));
  const [displayName, setDisplayName] = useState(generatedIdentity ? '' : initialIdentity.displayName);
  const [availability, setAvailability] = useState<SocialIdentityAvailabilityResult>(idleAvailability);
  const [isChecking, setIsChecking] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingLocal, setIsSwitchingLocal] = useState(false);
  const [feedback, setFeedback] = useState<
    | { readonly tone: 'error' | 'info' | 'success'; readonly title: string; readonly message: string }
    | undefined
  >();

  const validation = useMemo(() => validateSocialHandle(handle), [handle]);

  const verifyAvailability = async () => {
    setIsChecking(true);
    setFeedback(undefined);
    try {
      setAvailability(await checkAccountSocialHandleAvailability(
        cloudPort,
        handle,
        accountUserId,
      ));
    } catch (error) {
      setAvailability({
        status: 'unavailable',
        message: error instanceof Error
          ? error.message
          : 'Vérification indisponible. La réservation finale reste protégée.',
      });
    } finally {
      setIsChecking(false);
    }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(undefined);
    setIsSaving(true);

    try {
      const result = await provisionAccountSocialIdentity({
        accountUserId,
        currentIdentity: initialIdentity,
        handle,
        displayName,
        repository,
        cloudPort,
      });

      if (result.status !== 'saved') {
        setFeedback({
          tone: 'error',
          title: result.status === 'conflict' ? 'Pseudonyme déjà pris' : 'Identité non enregistrée',
          message: result.message,
        });
        return;
      }

      setFeedback({
        tone: 'success',
        title: 'Identité sociale confirmée',
        message: result.message,
      });
      onCompleted(result.identity);
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Identité non enregistrée',
        message: error instanceof Error
          ? error.message
          : 'La réservation du pseudonyme a échoué.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const switchToLocal = async () => {
    if (!onUseLocal) return;
    setIsSwitchingLocal(true);
    setFeedback(undefined);
    try {
      await onUseLocal();
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Retour au mode local impossible',
        message: error instanceof Error ? error.message : 'La déconnexion a échoué.',
      });
      setIsSwitchingLocal(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:grid lg:place-items-center lg:py-10">
      <Card className="mx-auto w-full max-w-3xl p-5 sm:p-7">
        <div className="flex items-start gap-3">
          <div className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <AtSign aria-hidden="true" className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Identité sociale
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Choisir ton pseudonyme SportPilot
            </h1>
            <p className="mt-2 leading-7 text-slate-600 dark:text-slate-300">
              Un compte connecté doit posséder un pseudonyme public unique avant d’accéder à l’application. Ton prénom de profil sportif reste privé et n’est jamais repris automatiquement ici.
            </p>
          </div>
        </div>

        {initialNotice && !feedback ? (
          <InlineNotice className="mt-5" tone="info" title="Identité à confirmer">
            {initialNotice}
          </InlineNotice>
        ) : null}

        {feedback ? (
          <InlineNotice className="mt-5" tone={feedback.tone} title={feedback.title}>
            {feedback.message}
          </InlineNotice>
        ) : null}

        <form className="mt-6 space-y-5" onSubmit={(event) => void submit(event)}>
          <div className="grid gap-4 md:grid-cols-2">
            <FormField
              id="onboarding-social-handle"
              label="Pseudonyme public unique"
              required
              error={validation.status === 'invalid' && handle.trim() ? validation.message : undefined}
              description="3 à 24 caractères, en minuscules, en commençant par une lettre ou un chiffre."
            >
              <input
                autoCapitalize="none"
                autoComplete="username"
                className={inputClasses}
                id="onboarding-social-handle"
                onChange={(event) => {
                  setHandle(event.target.value);
                  setAvailability(idleAvailability);
                }}
                placeholder="ex. alex.run"
                spellCheck={false}
                value={handle}
              />
            </FormField>

            <FormField
              id="onboarding-social-display-name"
              label="Nom affiché publiquement"
              description="Facultatif. À défaut, le pseudonyme sera utilisé."
            >
              <input
                autoComplete="nickname"
                className={inputClasses}
                id="onboarding-social-display-name"
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="ex. Alex Trail"
                value={displayName}
              />
            </FormField>
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
            <InlineNotice
              tone={availability.status === 'alreadyTaken' || availability.status === 'invalidHandle' ? 'error' : 'info'}
              title="Disponibilité"
            >
              {availability.message}
            </InlineNotice>
            <Button
              disabled={isChecking || validation.status === 'invalid'}
              onClick={() => void verifyAvailability()}
              type="button"
              variant="secondary"
            >
              <RefreshCw aria-hidden="true" className={isChecking ? 'size-4 animate-spin' : 'size-4'} />
              {isChecking ? 'Vérification…' : 'Vérifier'}
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
            <div className="flex items-start gap-3">
              <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700 dark:text-brand-300" />
              <p>
                La réservation est effectuée côté serveur avant toute sauvegarde locale. Si deux comptes demandent le même pseudonyme, un seul peut l’obtenir et l’autre conserve son identité précédente.
              </p>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <Button
              disabled={isSaving || validation.status === 'invalid'}
              type="submit"
            >
              <CheckCircle2 aria-hidden="true" className="size-4" />
              {isSaving ? 'Réservation…' : 'Réserver et continuer'}
            </Button>
            {onUseLocal ? (
              <Button
                disabled={isSaving || isSwitchingLocal}
                onClick={() => void switchToLocal()}
                type="button"
                variant="secondary"
              >
                <Cloud aria-hidden="true" className="size-4" />
                {isSwitchingLocal ? 'Passage en local…' : 'Revenir au mode local'}
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
    </main>
  );
}
