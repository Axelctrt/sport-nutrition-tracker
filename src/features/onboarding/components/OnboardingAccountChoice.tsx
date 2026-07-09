import { Cloud, CloudOff, KeyRound, LockKeyhole, Mail, ShieldCheck } from 'lucide-react';
import { type FormEvent, useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react';
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

interface OnboardingAccountChoiceProps {
  onChooseLocal: () => void | Promise<void>;
  onContinueWithAccount: () => void;
  client?: SyncPrototypeClient | null;
  accountEnabled?: boolean;
  configurationError?: string;
}

type AccountActionStatus = 'idle' | 'initializing' | 'email' | 'otp' | 'logout';

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
      return 'Le code saisi est incorrect ou a expiré.';
    default:
      return alert.message || 'La connexion a été refusée.';
  }
}

export function OnboardingAccountChoice({
  onChooseLocal,
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
          message: errorMessage(
            error,
            'Le compte ne peut pas être préparé pour le moment.',
          ),
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

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;

    const normalizedEmail = email.trim();
    if (!normalizedEmail) {
      setFeedback({
        tone: 'error',
        title: 'Adresse email requise',
        message: 'Saisis l’adresse qui recevra le code de connexion.',
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
      .then(() => {
        setFeedback({
          tone: 'success',
          title: 'Compte connecté',
          message:
            'Le compte est authentifié. SportPilot va maintenant demander comment protéger ou associer les données locales.',
        });
      })
      .catch((error: unknown) => {
        if (cancelledLoginRef.current) {
          cancelledLoginRef.current = false;
          return;
        }
        setFeedback({
          tone: 'error',
          title: 'Connexion interrompue',
          message: errorMessage(
            error,
            'La connexion par code n’a pas pu être terminée.',
          ),
        });
      })
      .finally(() => {
        setActionStatus((current) =>
          current === 'email' || current === 'otp' ? 'idle' : current,
        );
      });
  };

  const handleOtpSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!client) return;
    const normalizedOtp = otp.trim();
    if (!normalizedOtp) return;

    setActionStatus('otp');
    client.submitInteraction({ otp: normalizedOtp });
    setActionStatus('idle');
  };

  const handleCancelInteraction = () => {
    if (!client) return;
    cancelledLoginRef.current = true;
    client.cancelInteraction();
    setOtp('');
    setActionStatus('idle');
    setFeedback(undefined);
  };

  const logoutAccount = async (showSuccessFeedback: boolean): Promise<boolean> => {
    if (!client) return false;
    setActionStatus('logout');
    setFeedback(undefined);
    try {
      await client.logout();
      setEmail('');
      setOtp('');
      if (showSuccessFeedback) {
        setFeedback({
          tone: 'success',
          title: 'Compte déconnecté',
          message: 'Le mode local reste disponible et les données locales sont conservées.',
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

  const handleLogout = async () => {
    await logoutAccount(true);
  };

  const handleChooseLocal = async () => {
    if (isLoggedIn && client) {
      const loggedOut = await logoutAccount(false);
      if (!loggedOut) return;
    }

    await onChooseLocal();
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Espace de données
        </p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">
          Choisir comment démarrer
        </h2>
        <p className="mt-2 text-slate-600 dark:text-slate-300">
          Tu peux rester en local sur cet appareil ou connecter un compte pour préparer la synchronisation. Aucune donnée locale n’est copiée ou supprimée sans confirmation explicite.
        </p>
      </div>

      {feedback ? (
        <InlineNotice tone={feedback.tone} title={feedback.title}>
          {feedback.message}
        </InlineNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <CloudOff aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
            Continuer en local
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            SportPilot utilise uniquement la base locale de cet appareil. Ces données peuvent être perdues si le stockage du navigateur est effacé. Un compte pourra être ajouté plus tard depuis Paramètres → Compte et appareils, sans écrasement silencieux.
          </p>
          <Button
            className="mt-4 w-full"
            disabled={actionStatus === 'logout'}
            onClick={() => void handleChooseLocal()}
          >
            {actionStatus === 'logout' ? 'Passage en mode local…' : 'Choisir le mode local'}
          </Button>
        </Card>

        <Card className="p-5 sm:p-6">
          <Cloud aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" />
          <h3 className="mt-3 text-lg font-semibold text-slate-950 dark:text-white">
            Connecter un compte
          </h3>
          <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Authentification par email et code à usage unique. Après connexion, SportPilot demandera s’il faut ouvrir, restaurer, associer ou créer l’espace de données du compte.
          </p>

          {!accountEnabled || !client ? (
            <InlineNotice
              className="mt-4"
              tone="info"
              title="Compte indisponible dans cet environnement"
            >
              {configurationError ??
                'La connexion compte n’est pas activée ici. Le mode local reste disponible.'}
            </InlineNotice>
          ) : isLoggedIn ? (
            <div className="mt-4 space-y-3">
              <div className="rounded-2xl bg-emerald-50 p-3 text-sm text-emerald-950 dark:bg-emerald-950/40 dark:text-emerald-100">
                <div className="flex items-start gap-2">
                  <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                  <p>
                    Compte connecté : <span className="font-semibold break-all">{accountLabel}</span>
                  </p>
                </div>
              </div>
              <Button className="w-full" onClick={onContinueWithAccount}>
                Continuer avec ce compte
              </Button>
              <Button
                className="w-full"
                disabled={actionStatus === 'logout'}
                onClick={() => void handleLogout()}
                variant="secondary"
              >
                Déconnecter ce compte
              </Button>
            </div>
          ) : interaction?.type === 'otp' ? (
            <form className="mt-4 space-y-3" onSubmit={handleOtpSubmit}>
              <InlineNotice tone={fieldError ? 'error' : 'info'} title="Code de connexion">
                {fieldError ?? 'Saisis le code reçu par email pour terminer la connexion.'}
              </InlineNotice>
              <FormField id="onboarding-account-otp" label="Code reçu" required>
                <input
                  autoComplete="one-time-code"
                  autoFocus
                  className={inputClasses}
                  id="onboarding-account-otp"
                  inputMode="numeric"
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Code à usage unique"
                  value={otp}
                />
              </FormField>
              <div className="grid gap-2 sm:grid-cols-2">
                <Button disabled={!otp.trim()} type="submit">
                  <KeyRound aria-hidden="true" className="size-4" />
                  Valider le code
                </Button>
                <Button onClick={handleCancelInteraction} variant="secondary">
                  Annuler
                </Button>
              </div>
            </form>
          ) : (
            <form className="mt-4 space-y-3" onSubmit={handleEmailSubmit}>
              <FormField
                error={fieldError}
                id="onboarding-account-email"
                label="Email du compte"
                required
              >
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
              <Button
                className="w-full"
                disabled={actionStatus === 'email' || actionStatus === 'initializing'}
                type="submit"
              >
                <Mail aria-hidden="true" className="size-4" />
                {actionStatus === 'initializing'
                  ? 'Préparation…'
                  : actionStatus === 'email'
                    ? 'Envoi du code…'
                    : 'Recevoir un code'}
              </Button>
            </form>
          )}
        </Card>
      </div>

      <InlineNotice tone="info" title="Protection avant association">
        Les données locales restent dans l’espace invité tant que tu n’as pas choisi explicitement de les associer à un compte. Les codes OTP et secrets ne sont jamais enregistrés dans le brouillon d’onboarding.
      </InlineNotice>

      <div className="flex items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm text-slate-600 dark:border-slate-800 dark:text-slate-300">
        <LockKeyhole aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-700 dark:text-brand-300" />
        <p>
          Si tu connectes un compte existant, l’écran de protection des données demandera ensuite s’il faut restaurer le cloud, ouvrir un espace déjà connu, rattacher les données invitées ou créer un espace vide.
        </p>
      </div>
    </div>
  );
}
