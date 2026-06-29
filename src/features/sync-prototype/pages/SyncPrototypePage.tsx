import {
  Cloud,
  CloudOff,
  KeyRound,
  LogOut,
  Mail,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import {
  type FormEvent,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeInteractionSnapshot,
  type SyncPrototypeSyncSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { SYNC_PROTOTYPE_DATABASE_NAME } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface SyncPrototypePageProps {
  client?: SyncPrototypeClient;
}

type ActionStatus = 'idle' | 'email' | 'otp' | 'logout' | 'sync';

const inputClasses =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-slate-950 shadow-sm outline-none transition focus:border-brand-600 focus:ring-2 focus:ring-brand-600/20 disabled:cursor-not-allowed disabled:opacity-70 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

const syncStatusLabels: Record<
  SyncPrototypeSyncSnapshot['status'],
  string
> = {
  'not-started': 'Non démarrée',
  connecting: 'Connexion en cours',
  connected: 'Connectée',
  disconnected: 'Déconnectée',
  error: 'Erreur',
  offline: 'Hors ligne',
};

const syncPhaseLabels: Record<
  SyncPrototypeSyncSnapshot['phase'],
  string
> = {
  initial: 'Initialisation',
  'not-in-sync': 'Modifications en attente',
  pushing: 'Envoi des modifications',
  pulling: 'Réception des modifications',
  'in-sync': 'À jour',
  error: 'Erreur',
  offline: 'Hors ligne',
};

function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

function maskEmail(email: string): string {
  const [localPart, domain] = email.split('@');
  if (!localPart || !domain) return email;
  const visible = localPart.slice(0, Math.min(2, localPart.length));
  return `${visible}***@${domain}`;
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
    case 'LICENSE_LIMIT_REACHED':
      return 'La limite de comptes autorisés pour ce prototype est atteinte.';
    default:
      return alert.message || 'Dexie Cloud a refusé cette opération.';
  }
}

function interactionMessage(
  interaction: SyncPrototypeInteractionSnapshot,
): string {
  return (
    interaction.alerts.map((alert) => alert.message).filter(Boolean).join(' ') ||
    'Dexie Cloud demande une confirmation.'
  );
}

function SyncPrototypeRuntime({
  client,
}: {
  client: SyncPrototypeClient;
}) {
  const snapshot = useSyncExternalStore(
    client.subscribe,
    client.getSnapshot,
    client.getSnapshot,
  );
  const toast = useToast();
  const [actionStatus, setActionStatus] =
    useState<ActionStatus>('idle');
  const [isInitializing, setIsInitializing] = useState(true);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [feedback, setFeedback] = useState<
    | {
        tone: 'success' | 'error';
        title: string;
        message: string;
      }
    | undefined
  >();
  const cancelledLoginRef = useRef(false);
  const lastOtpNoticeRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    let cancelled = false;

    void client
      .initialize()
      .catch((error: unknown) => {
        if (cancelled) return;
        setFeedback({
          tone: 'error',
          title: 'Initialisation impossible',
          message: errorMessage(
            error,
            'La session locale Dexie Cloud n’a pas pu être restaurée.',
          ),
        });
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, [client]);

  const interaction = snapshot.interaction;

  useEffect(() => {
    setActionStatus((current) =>
      current === 'email' || current === 'otp' ? 'idle' : current,
    );

    if (interaction?.type !== 'otp') return;

    const sentAlert = interaction.alerts.find(
      (alert) => alert.messageCode === 'OTP_SENT',
    );
    const targetEmail = sentAlert?.messageParams.email || email;
    if (!targetEmail || lastOtpNoticeRef.current === targetEmail) return;

    lastOtpNoticeRef.current = targetEmail;
    setOtp('');
    toast.info(
      'Code envoyé',
      `Un code de connexion a été envoyé à ${maskEmail(targetEmail)}.`,
    );
  }, [email, interaction, toast]);

  const isLoggedIn = snapshot.account.isLoggedIn;
  const isCloudActionBusy =
    actionStatus === 'logout' || actionStatus === 'sync';
  const fieldError = interactionError(interaction);

  const handleEmailSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
      return;
    }

    cancelledLoginRef.current = false;
    void client
      .login(normalizedEmail)
      .then(() => {
        setFeedback({
          tone: 'success',
          title: 'Connexion confirmée',
          message:
            'Le compte de test est connecté. La base réelle de SportPilot reste séparée.',
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
            'La connexion OTP n’a pas pu être terminée.',
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
    const normalizedOtp = otp.trim();
    if (!normalizedOtp) return;

    setActionStatus('otp');
    client.submitInteraction({ otp: normalizedOtp });
  };

  const handleCancelInteraction = () => {
    cancelledLoginRef.current = true;
    client.cancelInteraction();
    setOtp('');
    setActionStatus('idle');
    setFeedback(undefined);
  };

  const handleSync = async () => {
    setFeedback(undefined);
    setActionStatus('sync');

    try {
      await client.syncNow();
      setFeedback({
        tone: 'success',
        title: 'Synchronisation demandée',
        message:
          'Dexie Cloud a terminé la demande de synchronisation du prototype.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Synchronisation impossible',
        message: errorMessage(
          error,
          'La synchronisation n’a pas pu être lancée.',
        ),
      });
    } finally {
      setActionStatus('idle');
    }
  };

  const handleLogout = async () => {
    setFeedback(undefined);
    setActionStatus('logout');

    try {
      await client.logout();
      setFeedback({
        tone: 'success',
        title: 'Prototype déconnecté',
        message:
          'La session Dexie Cloud de test a été fermée sur cet appareil.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Déconnexion impossible',
        message: errorMessage(
          error,
          'La session de test n’a pas pu être fermée.',
        ),
      });
    } finally {
      setActionStatus('idle');
    }
  };

  return (
    <section
      aria-labelledby="sync-prototype-title"
      className="min-w-0 space-y-4"
    >
      <header className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6 dark:border-slate-800 dark:bg-slate-900">
        <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
          Laboratoire isolé
        </p>
        <h1
          id="sync-prototype-title"
          className="mt-1 text-3xl font-bold tracking-tight text-slate-950 dark:text-white"
        >
          Prototype de synchronisation
        </h1>
        <p className="mt-3 max-w-3xl leading-7 text-slate-600 dark:text-slate-300">
          Cet écran utilise une seconde base IndexedDB et uniquement des
          données fictives. Il ne lit ni ne transfère les données réelles
          de SportPilot.
        </p>
      </header>

      <InlineNotice tone="info" title="Environnement expérimental">
        Le prototype est activé uniquement par la configuration locale de
        cet appareil. Il n’est pas accessible depuis la navigation
        normale.
      </InlineNotice>

      {feedback ? (
        <InlineNotice tone={feedback.tone} title={feedback.title}>
          {feedback.message}
        </InlineNotice>
      ) : null}

      {interaction?.type === 'message-alert' ? (
        <InlineNotice
          tone={fieldError ? 'error' : 'info'}
          title={interaction.title || 'Information Dexie Cloud'}
        >
          <p>{interactionMessage(interaction)}</p>
          <Button
            className="mt-3"
            onClick={() => client.submitInteraction({})}
            size="sm"
          >
            {interaction.submitLabel || 'Continuer'}
          </Button>
        </InlineNotice>
      ) : null}

      {interaction?.type === 'logout-confirmation' ? (
        <InlineNotice tone="info" title="Confirmer la déconnexion">
          <p>{interactionMessage(interaction)}</p>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row">
            <Button
              onClick={() => client.submitInteraction({})}
              size="sm"
              variant="danger"
            >
              {interaction.submitLabel || 'Se déconnecter'}
            </Button>
            <Button
              onClick={handleCancelInteraction}
              size="sm"
              variant="secondary"
            >
              {interaction.cancelLabel || 'Annuler'}
            </Button>
          </div>
        </InlineNotice>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {isLoggedIn ? (
                <Cloud aria-hidden="true" className="size-5" />
              ) : (
                <CloudOff aria-hidden="true" className="size-5" />
              )}
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                Compte de test
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                Authentification sans mot de passe par email et code à
                usage unique.
              </p>
            </div>
          </div>

          {isLoggedIn ? (
            <div className="mt-5 space-y-4">
              <dl className="grid gap-3 text-sm">
                <div>
                  <dt className="font-medium text-slate-500 dark:text-slate-400">
                    État
                  </dt>
                  <dd className="mt-1 font-semibold text-emerald-700 dark:text-emerald-300">
                    Connecté
                  </dd>
                </div>
                <div>
                  <dt className="font-medium text-slate-500 dark:text-slate-400">
                    Compte
                  </dt>
                  <dd className="mt-1 break-all text-slate-950 dark:text-white">
                    {snapshot.account.email ??
                      snapshot.account.userId ??
                      'Compte Dexie Cloud'}
                  </dd>
                </div>
                {snapshot.account.license ? (
                  <div>
                    <dt className="font-medium text-slate-500 dark:text-slate-400">
                      Licence
                    </dt>
                    <dd className="mt-1 text-slate-950 dark:text-white">
                      {snapshot.account.license.type} —{' '}
                      {snapshot.account.license.status}
                      {typeof snapshot.account.license.evalDaysLeft ===
                      'number'
                        ? ` — ${snapshot.account.license.evalDaysLeft} jours d’évaluation`
                        : ''}
                    </dd>
                  </div>
                ) : null}
              </dl>

              <Button
                className="w-full sm:w-auto"
                disabled={isCloudActionBusy || isInitializing}
                onClick={() => void handleLogout()}
                variant="secondary"
              >
                <LogOut aria-hidden="true" className="size-4" />
                {actionStatus === 'logout'
                  ? 'Déconnexion…'
                  : 'Déconnecter le prototype'}
              </Button>
            </div>
          ) : interaction?.type === 'otp' ? (
            <form className="mt-5 space-y-4" onSubmit={handleOtpSubmit}>
              <div className="flex items-start gap-3 rounded-xl bg-brand-50 p-3 text-brand-950 dark:bg-brand-950/40 dark:text-brand-100">
                <KeyRound aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                <p className="text-sm leading-6">
                  Consulte ta messagerie puis saisis le code reçu pour
                  confirmer la connexion.
                </p>
              </div>
              <FormField
                error={fieldError}
                id="sync-prototype-otp"
                label="Code de connexion"
                required
              >
                <input
                  autoComplete="one-time-code"
                  autoFocus
                  className={inputClasses}
                  disabled={actionStatus === 'otp'}
                  id="sync-prototype-otp"
                  inputMode="numeric"
                  onChange={(event) => setOtp(event.target.value)}
                  placeholder="Saisir le code reçu"
                  value={otp}
                />
              </FormField>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  disabled={!otp.trim() || actionStatus === 'otp'}
                  type="submit"
                >
                  <KeyRound aria-hidden="true" className="size-4" />
                  {actionStatus === 'otp'
                    ? 'Vérification…'
                    : interaction.submitLabel || 'Valider le code'}
                </Button>
                <Button
                  className="w-full sm:w-auto"
                  disabled={actionStatus === 'otp'}
                  onClick={handleCancelInteraction}
                  variant="secondary"
                >
                  {interaction.cancelLabel || 'Annuler'}
                </Button>
              </div>
            </form>
          ) : (
            <form className="mt-5 space-y-4" onSubmit={handleEmailSubmit}>
              <FormField
                description="Cette adresse recevra un code de connexion à usage unique."
                error={interaction?.type === 'email' ? fieldError : undefined}
                id="sync-prototype-email"
                label="Adresse email"
                required
              >
                <input
                  autoComplete="email"
                  autoFocus
                  className={inputClasses}
                  disabled={isInitializing || actionStatus === 'email'}
                  id="sync-prototype-email"
                  inputMode="email"
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="nom@exemple.com"
                  type="email"
                  value={email}
                />
              </FormField>
              <div className="flex flex-col gap-2 sm:flex-row">
                <Button
                  className="w-full sm:w-auto"
                  disabled={
                    isInitializing ||
                    actionStatus === 'email' ||
                    !email.trim()
                  }
                  type="submit"
                >
                  <Mail aria-hidden="true" className="size-4" />
                  {isInitializing
                    ? 'Restauration de la session…'
                    : actionStatus === 'email'
                      ? 'Envoi du code…'
                      : 'Recevoir mon code'}
                </Button>
                {interaction?.type === 'email' ? (
                  <Button
                    className="w-full sm:w-auto"
                    onClick={handleCancelInteraction}
                    variant="secondary"
                  >
                    {interaction.cancelLabel || 'Annuler'}
                  </Button>
                ) : null}
              </div>
            </form>
          )}
        </Card>

        <Card className="p-5 sm:p-6">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              <RefreshCw aria-hidden="true" className="size-5" />
            </span>
            <div className="min-w-0">
              <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
                État de synchronisation
              </h2>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                État technique de la base expérimentale uniquement.
              </p>
            </div>
          </div>

          <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">
                Connexion
              </dt>
              <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                {syncStatusLabels[snapshot.sync.status]}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">
                Phase
              </dt>
              <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                {syncPhaseLabels[snapshot.sync.phase]}
              </dd>
            </div>
            {typeof snapshot.sync.progress === 'number' ? (
              <div>
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  Progression
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {Math.round(snapshot.sync.progress)} %
                </dd>
              </div>
            ) : null}
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">
                Base locale
              </dt>
              <dd className="mt-1 break-all font-mono text-xs text-slate-950 dark:text-white">
                {SYNC_PROTOTYPE_DATABASE_NAME}
              </dd>
            </div>
          </dl>

          {snapshot.sync.errorMessage ? (
            <InlineNotice
              className="mt-4"
              tone="error"
              title="Erreur Dexie Cloud"
            >
              {snapshot.sync.errorMessage}
            </InlineNotice>
          ) : null}

          <Button
            className="mt-5 w-full sm:w-auto"
            disabled={!isLoggedIn || isCloudActionBusy || isInitializing}
            onClick={() => void handleSync()}
            variant="secondary"
          >
            <RefreshCw
              aria-hidden="true"
              className={
                actionStatus === 'sync'
                  ? 'size-4 animate-spin motion-reduce:animate-none'
                  : 'size-4'
              }
            />
            {actionStatus === 'sync'
              ? 'Synchronisation…'
              : 'Synchroniser maintenant'}
          </Button>
        </Card>
      </div>

      <Card className="p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
              Garde-fous actifs
            </h2>
            <ul className="mt-2 space-y-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              <li>Base IndexedDB distincte de la base réelle.</li>
              <li>Aucune donnée SportPilot importée automatiquement.</li>
              <li>Route masquée lorsque le feature flag est désactivé.</li>
              <li>Jetons et clés Dexie Cloud non exposés à l’interface.</li>
            </ul>
          </div>
        </div>
      </Card>
    </section>
  );
}

export function SyncPrototypePage({
  client,
}: SyncPrototypePageProps) {
  const [runtime] = useState<
    | { client: SyncPrototypeClient; error?: never }
    | { client?: never; error: string }
  >(() => {
    try {
      return {
        client: client ?? getSyncPrototypeClient(),
      };
    } catch (error) {
      return {
        error: errorMessage(
          error,
          'Le prototype de synchronisation ne peut pas être initialisé.',
        ),
      };
    }
  });

  if ('error' in runtime) {
    return (
      <InlineNotice tone="error" title="Prototype indisponible">
        {runtime.error}
      </InlineNotice>
    );
  }

  return <SyncPrototypeRuntime client={runtime.client} />;
}
