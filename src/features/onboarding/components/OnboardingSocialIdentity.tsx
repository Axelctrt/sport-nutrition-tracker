import { AtSign, CheckCircle2, Cloud, Info } from 'lucide-react';
import { type FormEvent, useMemo, useState } from 'react';
import {
  provisionAccountSocialIdentity,
} from '@/application/friends/accountSocialIdentityService';
import type { SocialIdentityRepository } from '@/application/friends/socialIdentityService';
import type { SocialCloudIdentityPort } from '@/domain/friends/socialCloudContract';
import {
  formatSocialHandle,
  isGeneratedDefaultSocialIdentity,
  validateSocialHandle,
  type SocialIdentity,
} from '@/domain/friends/socialIdentity';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';

interface OnboardingSocialIdentityProps {
  readonly accountUserId: string;
  readonly initialIdentity: SocialIdentity;
  readonly repository: SocialIdentityRepository;
  readonly cloudPort: Pick<SocialCloudIdentityPort, 'lookupByHandle' | 'publishIdentity'>;
  readonly onCompleted: (identity: SocialIdentity) => void;
  readonly onUseLocal?: () => void | Promise<void>;
  readonly initialNotice?: string;
}

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
  const [isSaving, setIsSaving] = useState(false);
  const [isSwitchingLocal, setIsSwitchingLocal] = useState(false);
  const [feedback, setFeedback] = useState<
    | { readonly tone: 'error' | 'info' | 'success'; readonly title: string; readonly message: string }
    | undefined
  >();

  const validation = useMemo(() => validateSocialHandle(handle), [handle]);

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
          title: result.status === 'conflict' ? 'Identifiant déjà pris' : 'Identité non enregistrée',
          message: result.message,
        });
        return;
      }

      onCompleted(result.identity);
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Identité non enregistrée',
        message: error instanceof Error
          ? error.message
          : 'La réservation de l’identifiant a échoué.',
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
    <main className="fixed inset-0 h-[100dvh] overflow-hidden bg-slate-50 px-4 py-3 dark:bg-slate-950 sm:px-6 sm:py-5 lg:grid lg:place-items-center lg:py-8">
      <Card className="mx-auto grid h-full w-full max-w-2xl grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden p-4 sm:h-auto sm:max-h-[calc(100dvh-2.5rem)] sm:p-6">
        <header className="flex items-start gap-3 pb-3">
          <div className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-brand-800 dark:bg-brand-950 dark:text-brand-200">
            <AtSign aria-hidden="true" className="size-6" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Identité sociale
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
              Votre identité sociale
            </h1>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Choisissez l’identifiant et le nom visibles par vos amis.
            </p>
          </div>
        </header>

        <form id="onboarding-social-identity-form" className="grid min-h-0 content-start gap-2.5 overflow-hidden" onSubmit={(event) => void submit(event)}>
          {initialNotice && !feedback ? (
            <div
              className="flex items-start gap-2 rounded-xl bg-sky-50 px-3 py-2 text-xs leading-4 text-sky-900 dark:bg-sky-950/35 dark:text-sky-100"
              role="status"
            >
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{initialNotice}</span>
            </div>
          ) : null}

          {feedback ? (
            <div
              className={`flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-4 ${
                feedback.tone === 'error'
                  ? 'bg-rose-50 text-rose-900 dark:bg-rose-950/35 dark:text-rose-100'
                  : 'bg-sky-50 text-sky-900 dark:bg-sky-950/35 dark:text-sky-100'
              }`}
              role="status"
            >
              <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
              <span>{feedback.message}</span>
            </div>
          ) : null}

          <div className="grid gap-3 sm:grid-cols-2">
            <FormField
              id="onboarding-social-handle"
              label="Identifiant public"
              required
              error={validation.status === 'invalid' && handle.trim() ? validation.message : undefined}
              description="3 à 24 caractères, en minuscules. Exemple : axel_aka_dieu"
            >
              <input
                autoCapitalize="none"
                autoComplete="username"
                className={inputClasses}
                id="onboarding-social-handle"
                onChange={(event) => setHandle(event.target.value)}
                placeholder="axel_aka_dieu"
                spellCheck={false}
                value={handle}
              />
            </FormField>

            <FormField
              id="onboarding-social-display-name"
              label="Nom affiché"
              description="Facultatif. Exemple : Axel le Dieu"
            >
              <input
                autoComplete="nickname"
                className={inputClasses}
                id="onboarding-social-display-name"
                maxLength={80}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Axel le Dieu"
                value={displayName}
              />
            </FormField>
          </div>

          <p className="flex items-start gap-2 text-xs leading-4 text-slate-500 dark:text-slate-400">
            <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700 dark:text-brand-300" />
            L’identifiant est public et unique. Le nom de votre profil sportif reste séparé.
          </p>
        </form>

        <div className="grid shrink-0 gap-2 border-t border-slate-200 pt-3 dark:border-slate-800 sm:grid-cols-2">
          <Button
            disabled={isSaving || validation.status === 'invalid'}
            form="onboarding-social-identity-form"
            type="submit"
          >
            <CheckCircle2 aria-hidden="true" className="size-4" />
            {isSaving ? 'Enregistrement…' : 'Enregistrer et continuer'}
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
      </Card>
    </main>
  );
}
