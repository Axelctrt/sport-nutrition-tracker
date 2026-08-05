import { ArrowLeft, Cloud, CloudOff, KeyRound, LogOut, Mail, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
import { routePaths } from '@/app/routePaths';
import { prepareConnectedOnboardingAccount } from '@/features/onboarding/account/prepareConnectedOnboardingAccount';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeInteractionSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfigSafely } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { OTP_CODE_LENGTH, OtpCodeInput } from '@/shared/ui/OtpCodeInput';

interface OnboardingAccountChoiceProps {
  screen: 'choice' | 'connection';
  onChooseLocal: () => void | Promise<void>;
  onChooseAccount: () => void;
  onBackToChoice: () => void;
  onContinueWithAccount: () => void | Promise<void>;
  client?: SyncPrototypeClient | null;
  accountEnabled?: boolean;
  configurationError?: string;
}

type AccountActionStatus = 'idle' | 'initializing' | 'email' | 'otp' | 'preparing' | 'logout';

const inputClasses =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

function resolveRuntimeClient(): {
  client: SyncPrototypeClient | null;
  accountEnabled: boolean;
  configurationError?: string;
} {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (!config.enabled) {
    return {
      client: null,
      accountEnabled: false,
      ...(errorMessage ? { configurationError: errorMessage } : {}),
    };
  }

  return {
    client: getSyncPrototypeClient(),
    accountEnabled: true,
  };
}

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function interactionError(
  interaction: SyncPrototypeInteractionSnapshot | undefined,
): string | undefined {
  const alert = interaction?.alerts.find((item) => item.type === 'error');
  if (!alert) return undefined;

  switch (alert.messageCode) {
    case 'INVALID_EMAIL':
      return 'Cette adresse email n’est pas valide.';
    case 'INVALID_OTP':
      return 'Le code est incorrect ou expiré.';
    default:
      return alert.message || 'La connexion a été refusée.';
  }
}

export function OnboardingAccountChoice({
  screen,
  onChooseLocal,
  onChooseAccount,
  onBackToChoice,
  onContinueWithAccount,
  client: injectedClient,
  accountEnabled: injectedAccountEnabled,
  configurationError: injectedConfigurationError,
}: OnboardingAccountChoiceProps) {
  const runtime = useMemo(resolveRuntimeClient, []);
  const client = injectedClient !== undefined ? injectedClient : runtime.client;
  const accountEnabled = injectedAccountEnabled ?? runtime.accountEnabled;
  const configurationError = injectedConfigurationError ?? runtime.configurationError;
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [actionStatus, setActionStatus] = useState<AccountActionStatus>('idle');
  const [feedback, setFeedback] = useState<
    | { tone: 'success' | 'error' | 'info'; title: string; message: string }
    | undefined
  >();
  const cancelledLoginRef = useRef(false);
  const handledConnectedRef = useRef(false);

  const snapshot = useSyncExternalStore(
    client?.subscribe ?? (() => () => undefined),
    client?.getSnapshot ?? (() => undefined),
    client?.getSnapshot ?? (() => undefined),
  );

  useEffect(() => {
    if (!client || !accountEnabled) return;

    let cancelled = false;
    setActionStatus('initializing');
    void client.initialize()
      .catch((error: unknown) => {
        if (cancelled) return;
        setFeedback({
          tone: 'error',
          title: 'Connexion indisponible',
          message: errorMessage(error, 'Le compte ne peut pas être préparé.'),
        });
      })
      .finally(() => {
        if (!cancelled) setActionStatus('idle');
      });

    return () => {
      cancelled = true;
    };
  }, [accountEnabled, client]);

  const interaction = snapshot?.interaction;
  const fieldError = interactionError(interaction);
  const isLoggedIn = snapshot?.account.isLoggedIn === true;
  const accountLabel = snapshot?.account.email ?? snapshot?.account.userId ?? 'Compte connecté';

  useEffect(() => {
    if (fieldError && actionStatus === 'otp') setActionStatus('idle');
  }, [actionStatus, fieldError]);

  useEffect(() => {
    if (
      screen !== 'connection'
      || !client
      || !isLoggedIn
      || handledConnectedRef.current
    ) return;

    handledConnectedRef.current = true;
    setActionStatus('preparing');
    setFeedback({
      tone: 'info',
      title: 'Compte validé',
      message: 'SportPilot prépare ton espace et recherche tes données existantes.',
    });

    void (async () => {
      try {
        if (injectedClient === undefined) {
          const preparation = await prepareConnectedOnboardingAccount(client);
          if (preparation.reloading) return;
          if (preparation.status === 'choice-required') {
            window.location.hash = routePaths.dashboard;
            return;
          }
        }

        await onContinueWithAccount();
        setActionStatus('idle');
      } catch (error) {
        handledConnectedRef.current = false;
        setActionStatus('idle');
        setFeedback({
          tone: 'error',
          title: 'Préparation interrompue',
          message: errorMessage(error, 'L’espace de ce compte n’a pas pu être préparé.'),
        });
      }
    })();
  }, [client, injectedClient, isLoggedIn, onContinueWithAccount, screen]);

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFeedback({
        tone: 'error',
        title: 'Adresse requise',
        message: 'Saisis l’adresse qui recevra le code.',
      });
      return;
    }

    setFeedback(undefined);
    setActionStatus('email');

    if (interaction?.type === 'email') {
      client.submitInteraction({ email: normalizedEmail });
      setActionStatus('idle');
      return;
    }

    cancelledLoginRef.current = false;
    void client.login(normalizedEmail)
      .catch((error: unknown) => {
        if (cancelledLoginRef.current) {
          cancelledLoginRef.current = false;
          return;
        }
        setFeedback({
          tone: 'error',
          title: 'Connexion interrompue',
          message: errorMessage(error, 'Le code n’a pas pu être envoyé.'),
        });
      })
      .finally(() => {
        setActionStatus((current) => current === 'email' ? 'idle' : current);
      });
  };

  const handleOtpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    const normalizedOtp = otp.trim();
    if (
      normalizedOtp.length !== OTP_CODE_LENGTH
      || actionStatus === 'otp'
      || actionStatus === 'preparing'
    ) return;

    setFeedback(undefined);
    setActionStatus('otp');
    client.submitInteraction({ otp: normalizedOtp });
  };

  const handleCancelInteraction = () => {
    if (!client) return;
    cancelledLoginRef.current = true;
    client.cancelInteraction();
    setOtp('');
    setActionStatus('idle');
    setFeedback(undefined);
  };

  const logoutAccount = async (showFeedback: boolean): Promise<boolean> => {
    if (!client) return false;
    setActionStatus('logout');
    setFeedback(undefined);
    try {
      await client.logout();
      handledConnectedRef.current = false;
      setEmail('');
      setOtp('');
      if (showFeedback) {
        setFeedback({
          tone: 'success',
          title: 'Compte déconnecté',
          message: 'Tu peux utiliser un autre compte.',
        });
      }
      return true;
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Déconnexion impossible',
        message: errorMessage(error, 'La session n’a pas pu être fermée.'),
      });
      return false;
    } finally {
      setActionStatus('idle');
    }
  };

  const handleChooseLocal = async () => {
    if (isLoggedIn && client) {
      const loggedOut = await logoutAccount(false);
      if (!loggedOut) return;
    }
    await onChooseLocal();
  };

  if (screen === 'choice') {
    return (
      <div className="mx-auto grid w-full max-w-xl gap-3 sm:grid-cols-2">
        <button
          aria-label="Choisir le mode local"
          className="min-h-36 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 dark:border-slate-800 dark:bg-slate-900"
          disabled={actionStatus === 'logout'}
          onClick={() => void handleChooseLocal()}
          type="button"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/45 dark:text-brand-300">
              <CloudOff aria-hidden="true" className="size-6" />
            </span>
            <span className="text-lg font-semibold text-slate-950 dark:text-white">Mode local</span>
          </span>
          <span className="mt-3 block text-sm leading-5 text-slate-600 dark:text-slate-300">
            Utilise SportPilot immédiatement. Tes données restent sur cet appareil.
          </span>
          <span className="mt-2 block text-xs font-medium leading-4 text-brand-700 dark:text-brand-300">
            Un compte pourra être associé plus tard depuis Paramètres → Compte et appareils.
          </span>
        </button>

        <button
          aria-label="Connecter un compte"
          className="min-h-36 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-brand-400 hover:shadow-md active:scale-[0.98] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600 disabled:cursor-not-allowed disabled:opacity-55 dark:border-slate-800 dark:bg-slate-900"
          disabled={!accountEnabled || !client}
          onClick={onChooseAccount}
          type="button"
        >
          <span className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-700 dark:bg-brand-950/45 dark:text-brand-300">
              <Cloud aria-hidden="true" className="size-6" />
            </span>
            <span className="text-lg font-semibold text-slate-950 dark:text-white">Connecter un compte</span>
          </span>
          <span className="mt-3 block text-sm leading-5 text-slate-600 dark:text-slate-300">
            Synchronise tes données et retrouve-les sur plusieurs appareils.
          </span>
          <span className="mt-2 block text-xs font-medium leading-4 text-brand-700 dark:text-brand-300">
            Ton adresse e-mail sera demandée à l’étape suivante.
          </span>
        </button>

        {!accountEnabled || !client ? (
          <p className="text-center text-xs text-slate-500 dark:text-slate-400 sm:col-span-2" role="status">
            {configurationError ?? 'Connexion compte indisponible ici.'}
          </p>
        ) : null}
      </div>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-xl p-5 sm:p-6">
      {feedback ? (
        <InlineNotice className="mb-3" tone={feedback.tone} title={feedback.title}>
          {feedback.message}
        </InlineNotice>
      ) : null}

      {!accountEnabled || !client ? (
        <InlineNotice tone="info" title="Compte indisponible">
          {configurationError ?? 'La connexion compte n’est pas activée ici.'}
        </InlineNotice>
      ) : actionStatus === 'preparing' ? (
        <div className="space-y-3" aria-live="polite" aria-busy="true">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate font-semibold">{accountLabel}</span>
          </div>
          <div className="rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-900 dark:bg-brand-950/25">
            <p className="font-semibold text-slate-950 dark:text-white">Préparation de ton espace</p>
            <ol className="mt-3 space-y-2 text-sm text-slate-600 dark:text-slate-300">
              <li>✓ Compte vérifié</li>
              <li className="font-semibold text-brand-700 dark:text-brand-300">● Recherche de tes données</li>
              <li>○ Préparation du profil</li>
            </ol>
          </div>
        </div>
      ) : isLoggedIn ? (
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
            <ShieldCheck aria-hidden="true" className="size-4 shrink-0" />
            <span className="min-w-0 truncate font-semibold">{accountLabel}</span>
          </div>
          <Button className="w-full" onClick={() => void onContinueWithAccount()}>
            Continuer
          </Button>
          <Button
            className="w-full"
            disabled={actionStatus === 'logout'}
            onClick={() => void logoutAccount(true)}
            variant="secondary"
          >
            <LogOut aria-hidden="true" className="size-4" />
            Changer de compte
          </Button>
        </div>
      ) : interaction?.type === 'otp' ? (
        <form className="space-y-3" onSubmit={handleOtpSubmit}>
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Code envoyé à <span className="font-semibold">{email.trim()}</span>
          </p>
          <FormField error={fieldError} id="onboarding-account-otp" label="Code reçu" required>
            {(controlProps) => (
              <OtpCodeInput
                {...controlProps}
                autoFocus
                disabled={actionStatus === 'otp'}
                onValueChange={setOtp}
                value={otp}
              />
            )}
          </FormField>
          <Button
            className="w-full"
            disabled={otp.length !== OTP_CODE_LENGTH || actionStatus === 'otp'}
            type="submit"
          >
            <KeyRound aria-hidden="true" className="size-4" />
            {actionStatus === 'otp' ? 'Validation…' : 'Valider le code'}
          </Button>
          <Button className="w-full" disabled={actionStatus === 'otp'} onClick={handleCancelInteraction} variant="secondary">
            Modifier l’adresse
          </Button>
        </form>
      ) : (
        <form className="space-y-3" onSubmit={handleEmailSubmit}>
          <FormField error={fieldError} id="onboarding-account-email" label="Adresse e-mail" required>
            <input
              autoComplete="email"
              className={inputClasses}
              disabled={actionStatus === 'email' || actionStatus === 'initializing'}
              id="onboarding-account-email"
              inputMode="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="nom@example.com"
              type="email"
              value={email}
            />
          </FormField>
          <p className="rounded-xl bg-slate-100 px-3 py-2 text-xs leading-4 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
            Aucun mot de passe à retenir : le code reçu est temporaire.
          </p>
          <Button
            className="w-full"
            disabled={actionStatus === 'email' || actionStatus === 'initializing'}
            type="submit"
          >
            <Mail aria-hidden="true" className="size-4" />
            {actionStatus === 'initializing'
              ? 'Préparation…'
              : actionStatus === 'email'
                ? 'Envoi…'
                : 'Recevoir un code'}
          </Button>
        </form>
      )}

      <Button className="mt-3 w-full" disabled={actionStatus === 'otp' || actionStatus === 'preparing'} onClick={onBackToChoice} variant="ghost">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Retour au choix
      </Button>
    </Card>
  );
}
