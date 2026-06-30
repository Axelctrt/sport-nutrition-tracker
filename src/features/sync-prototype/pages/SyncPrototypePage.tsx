import {
  ChevronDown,
  ClipboardCopy,
  Cloud,
  CloudOff,
  Fingerprint,
  KeyRound,
  LogOut,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Scale,
  ShieldCheck,
  Trash2,
  X,
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
  type SyncPrototypeWeightDraft,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  createSyncPrototypeDiagnosticReport,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import type { WeightEntry } from '@/domain/models/weight';
import { SYNC_PROTOTYPE_DATABASE_NAME } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { formatLocalDate, toLocalDate } from '@/shared/utils/dates';
import { useToast } from '@/shared/toast/useToast';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { FormField } from '@/shared/ui/FormField';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';

interface SyncPrototypePageProps {
  client?: SyncPrototypeClient;
}

type ActionStatus =
  | 'idle'
  | 'email'
  | 'otp'
  | 'logout'
  | 'sync'
  | 'weight-save'
  | 'weight-delete'
  | 'real-weight-analyze'
  | 'real-weight-sync';

interface WeightDraftState {
  date: string;
  weightKg: string;
  note: string;
}

function createEmptyWeightDraft(): WeightDraftState {
  return {
    date: toLocalDate(),
    weightKg: '',
    note: '',
  };
}

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

function formatDiagnosticDate(value: string | undefined): string {
  if (!value) return 'Jamais';

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
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
  const [weightDraft, setWeightDraft] = useState<WeightDraftState>(
    createEmptyWeightDraft,
  );
  const [editingWeightId, setEditingWeightId] = useState<string>();
  const [pendingDeletionId, setPendingDeletionId] = useState<string>();
  const [isWeightSectionOpen, setIsWeightSectionOpen] = useState(false);
  const [isDiagnosticsOpen, setIsDiagnosticsOpen] = useState(false);
  const [isRealWeightSectionOpen, setIsRealWeightSectionOpen] =
    useState(false);
  const [isRealWeightConfirmationOpen, setIsRealWeightConfirmationOpen] =
    useState(false);
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
  const wasLoggedInRef = useRef(false);
  const weightEditorRef = useRef<HTMLFormElement>(null);
  const weightInputRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (wasLoggedInRef.current && !isLoggedIn) {
      setEmail('');
      setOtp('');
      setWeightDraft(createEmptyWeightDraft());
      setEditingWeightId(undefined);
      setPendingDeletionId(undefined);
      setIsWeightSectionOpen(false);
      setIsDiagnosticsOpen(false);
      setIsRealWeightSectionOpen(false);
      setIsRealWeightConfirmationOpen(false);
      lastOtpNoticeRef.current = undefined;
    }
    wasLoggedInRef.current = isLoggedIn;
  }, [isLoggedIn]);

  useEffect(() => {
    if (!editingWeightId || !isWeightSectionOpen) return;

    weightEditorRef.current?.scrollIntoView?.({
      behavior: 'smooth',
      block: 'start',
    });
    weightInputRef.current?.focus({ preventScroll: true });
  }, [editingWeightId, isWeightSectionOpen]);

  const isCloudActionBusy =
    actionStatus === 'logout' || actionStatus === 'sync';
  const fieldError = interactionError(interaction);
  const realWeightSnapshot = snapshot.realWeights ?? {
    enabled: false,
    status: 'disabled' as const,
  };

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
      toast.success(
        'Synchronisation effectuée',
        'Les données fictives du prototype sont à jour.',
      );
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

  const handleCopyDiagnostics = async () => {
    setFeedback(undefined);

    if (!navigator.clipboard?.writeText) {
      setFeedback({
        tone: 'error',
        title: 'Copie indisponible',
        message:
          'Le navigateur ne permet pas de copier le diagnostic automatiquement.',
      });
      return;
    }

    try {
      const report = createSyncPrototypeDiagnosticReport(snapshot);
      await navigator.clipboard.writeText(
        JSON.stringify(report, null, 2),
      );
      toast.success(
        'Diagnostic copié',
        'Le rapport C3 ne contient ni email, ni jeton, ni donnée SportPilot réelle.',
      );
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Copie impossible',
        message: errorMessage(
          error,
          'Le diagnostic C3 n’a pas pu être copié.',
        ),
      });
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


  const handleAnalyzeRealWeights = async () => {
    setFeedback(undefined);
    setActionStatus('real-weight-analyze');

    try {
      const preview = await client.analyzeRealWeights();
      toast.info(
        'Analyse C4 terminée',
        `${preview.differingEntityCount} élément${preview.differingEntityCount > 1 ? 's' : ''} à faire converger.`,
      );
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Analyse C4 impossible',
        message: errorMessage(
          error,
          'Les vraies pesées n’ont pas pu être comparées.',
        ),
      });
    } finally {
      setActionStatus('idle');
    }
  };

  const handleSyncRealWeights = async () => {
    setIsRealWeightConfirmationOpen(false);
    setFeedback(undefined);
    setActionStatus('real-weight-sync');

    try {
      const result = await client.syncRealWeights();
      toast.success(
        'Pesées réelles synchronisées',
        `${result.uploadedWeights + result.downloadedWeights} écriture${result.uploadedWeights + result.downloadedWeights > 1 ? 's' : ''} de pesée appliquée${result.uploadedWeights + result.downloadedWeights > 1 ? 's' : ''}.`,
      );
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Synchronisation C4 impossible',
        message: errorMessage(
          error,
          'Les vraies pesées n’ont pas pu être synchronisées.',
        ),
      });
    } finally {
      setActionStatus('idle');
    }
  };


  const resetWeightEditor = () => {
    setWeightDraft(createEmptyWeightDraft());
    setEditingWeightId(undefined);
  };

  const handleWeightEdit = (entry: WeightEntry) => {
    setWeightDraft({
      date: entry.date,
      weightKg: entry.weightKg.toFixed(1),
      note: entry.note ?? '',
    });
    setEditingWeightId(entry.id);
    setPendingDeletionId(undefined);
    setIsWeightSectionOpen(true);
    setFeedback(undefined);
  };

  const handleWeightSubmit = async (
    event: FormEvent<HTMLFormElement>,
  ) => {
    event.preventDefault();
    setFeedback(undefined);
    setActionStatus('weight-save');

    const draft: SyncPrototypeWeightDraft = {
      date: weightDraft.date,
      weightKg: Number(weightDraft.weightKg.replace(',', '.')),
      ...(weightDraft.note.trim()
        ? { note: weightDraft.note.trim() }
        : {}),
    };

    try {
      await client.saveWeight(draft);
      setFeedback({
        tone: 'success',
        title: editingWeightId
          ? 'Pesée fictive mise à jour'
          : 'Pesée fictive ajoutée',
        message:
          'La modification a été enregistrée dans la base expérimentale et sera synchronisée par Dexie Cloud.',
      });
      resetWeightEditor();
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Enregistrement impossible',
        message: errorMessage(
          error,
          'La pesée fictive n’a pas pu être enregistrée.',
        ),
      });
    } finally {
      setActionStatus('idle');
    }
  };

  const handleWeightDelete = async (weightId: string) => {
    setFeedback(undefined);
    setActionStatus('weight-delete');

    try {
      await client.deleteWeight(weightId);
      setFeedback({
        tone: 'success',
        title: 'Pesée fictive supprimée',
        message:
          'Un marqueur de suppression synchronisable a été conservé pour empêcher sa réapparition.',
      });
      if (editingWeightId === weightId) resetWeightEditor();
      setPendingDeletionId(undefined);
    } catch (error) {
      setFeedback({
        tone: 'error',
        title: 'Suppression impossible',
        message: errorMessage(
          error,
          'La pesée fictive n’a pas pu être supprimée.',
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
          Cet écran utilise une seconde base IndexedDB. Les données fictives
          restent isolées ; la synchronisation C4 des vraies pesées n’est
          disponible qu’avec un second feature flag et une confirmation
          explicite.
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

      <Card className="overflow-hidden p-0">
        <button
          aria-controls="sync-prototype-diagnostics-content"
          aria-expanded={isDiagnosticsOpen}
          className="flex min-h-20 w-full items-center gap-3 p-5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:p-6 dark:hover:bg-slate-800/60"
          onClick={() => setIsDiagnosticsOpen((current) => !current)}
          type="button"
        >
          <span className="rounded-xl bg-emerald-50 p-2 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
            <Fingerprint aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-slate-950 dark:text-white">
              Diagnostic C3
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              Rapport non sensible pour comparer les appareils et les comptes.
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${
              isDiagnosticsOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isDiagnosticsOpen ? (
          <div
            className="space-y-5 border-t border-slate-200 p-5 sm:p-6 dark:border-slate-800"
            id="sync-prototype-diagnostics-content"
          >
            <InlineNotice tone="info" title="Politique de conflit testée">
              Des propriétés différentes se fusionnent. Pour une même
              propriété, la dernière opération reçue gagne. Un marqueur de
              suppression masque toujours une ancienne pesée réintroduite par
              un appareil hors ligne.
            </InlineNotice>

            <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
              <div>
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  Empreinte du compte
                </dt>
                <dd className="mt-1 break-all font-mono text-xs font-semibold text-slate-950 dark:text-white">
                  {snapshot.diagnostics.accountFingerprint ?? 'Non connecté'}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  Base expérimentale
                </dt>
                <dd className="mt-1 break-all font-mono text-xs font-semibold text-slate-950 dark:text-white">
                  {snapshot.diagnostics.databaseName} v
                  {snapshot.diagnostics.databaseVersion}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  Données visibles
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {snapshot.diagnostics.visibleWeightCount} pesée
                  {snapshot.diagnostics.visibleWeightCount > 1 ? 's' : ''} —{' '}
                  {snapshot.diagnostics.deletedWeightCount} suppression
                  {snapshot.diagnostics.deletedWeightCount > 1 ? 's' : ''}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  Dernière synchronisation terminée
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {formatDiagnosticDate(
                    snapshot.diagnostics.lastSyncCompletedAt,
                  )}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  Dernier rafraîchissement local
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {formatDiagnosticDate(snapshot.diagnostics.lastRefreshAt)}
                </dd>
              </div>
              <div>
                <dt className="font-medium text-slate-500 dark:text-slate-400">
                  Dernière pesée modifiée
                </dt>
                <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                  {formatDiagnosticDate(
                    snapshot.diagnostics.latestWeightUpdatedAt,
                  )}
                </dd>
              </div>
            </dl>

            <Button
              className="w-full sm:w-auto"
              onClick={() => void handleCopyDiagnostics()}
              variant="secondary"
            >
              <ClipboardCopy aria-hidden="true" className="size-4" />
              Copier le diagnostic
            </Button>
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden p-0">
        <button
          aria-controls="sync-real-weights-content"
          aria-expanded={isRealWeightSectionOpen}
          className="flex min-h-20 w-full items-center gap-3 p-5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:p-6 dark:hover:bg-slate-800/60"
          onClick={() =>
            setIsRealWeightSectionOpen((current) => !current)
          }
          type="button"
        >
          <span className="rounded-xl bg-amber-50 p-2 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            <ShieldCheck aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-slate-950 dark:text-white">
              C4 — vraies pesées SportPilot
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              Import bidirectionnel manuel, limité aux pesées et désactivable immédiatement.
            </span>
          </span>
          <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
            {realWeightSnapshot.enabled ? 'Activé' : 'Désactivé'}
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${
              isRealWeightSectionOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isRealWeightSectionOpen ? (
          <div
            className="space-y-4 border-t border-slate-200 p-5 sm:p-6 dark:border-slate-800"
            id="sync-real-weights-content"
          >
            {!realWeightSnapshot.enabled ? (
              <InlineNotice tone="info" title="Feature flag C4 désactivé">
                Ajoute <code>VITE_ENABLE_REAL_WEIGHT_SYNC=true</code> dans
                <code> .env.local</code>, puis redémarre Vite. Aucun accès aux
                vraies pesées n’a lieu tant que ce flag reste à false.
              </InlineNotice>
            ) : !isLoggedIn ? (
              <InlineNotice tone="info" title="Connexion requise">
                Connecte le même compte Dexie Cloud sur les appareils à synchroniser.
              </InlineNotice>
            ) : (
              <>
                <InlineNotice tone="info" title="Données réelles">
                  Cette action lit et écrit uniquement les tables locales
                  <code> weights</code> et <code>deletionRecords</code>. Les
                  séances, la nutrition, le profil et les paramètres restent hors périmètre.
                </InlineNotice>

                {realWeightSnapshot.errorMessage ? (
                  <InlineNotice tone="error" title="Erreur C4">
                    {realWeightSnapshot.errorMessage}
                  </InlineNotice>
                ) : null}

                {realWeightSnapshot.preview ? (
                  <dl className="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
                    <div><dt className="text-slate-500 dark:text-slate-400">Pesées locales</dt><dd className="mt-1 font-semibold">{realWeightSnapshot.preview.localWeightCount}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">Pesées cloud</dt><dd className="mt-1 font-semibold">{realWeightSnapshot.preview.cloudWeightCount}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">Suppressions locales</dt><dd className="mt-1 font-semibold">{realWeightSnapshot.preview.localDeletionCount}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">Suppressions cloud</dt><dd className="mt-1 font-semibold">{realWeightSnapshot.preview.cloudDeletionCount}</dd></div>
                    <div><dt className="text-slate-500 dark:text-slate-400">Éléments différents</dt><dd className="mt-1 font-semibold">{realWeightSnapshot.preview.differingEntityCount}</dd></div>
                  </dl>
                ) : null}

                {realWeightSnapshot.lastResult ? (
                  <InlineNotice tone="success" title="Dernière convergence terminée">
                    {realWeightSnapshot.lastResult.uploadedWeights} pesée(s) envoyée(s),{' '}
                    {realWeightSnapshot.lastResult.downloadedWeights} reçue(s),{' '}
                    {realWeightSnapshot.lastResult.removedLocalWeights + realWeightSnapshot.lastResult.removedCloudWeights} suppression(s) appliquée(s).
                  </InlineNotice>
                ) : null}

                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button
                    disabled={actionStatus === 'real-weight-analyze' || actionStatus === 'real-weight-sync'}
                    onClick={() => void handleAnalyzeRealWeights()}
                    variant="secondary"
                  >
                    <RefreshCw aria-hidden="true" className={actionStatus === 'real-weight-analyze' ? 'size-4 animate-spin' : 'size-4'} />
                    {actionStatus === 'real-weight-analyze' ? 'Analyse…' : 'Analyser sans modifier'}
                  </Button>
                  <Button
                    disabled={actionStatus === 'real-weight-analyze' || actionStatus === 'real-weight-sync'}
                    onClick={() => setIsRealWeightConfirmationOpen(true)}
                  >
                    <Cloud aria-hidden="true" className="size-4" />
                    Synchroniser les vraies pesées
                  </Button>
                </div>
              </>
            )}
          </div>
        ) : null}
      </Card>

      <Card className="overflow-hidden p-0">
        <button
          aria-controls="sync-prototype-weights-content"
          aria-expanded={isWeightSectionOpen}
          className="flex min-h-20 w-full items-center gap-3 p-5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:p-6 dark:hover:bg-slate-800/60"
          onClick={() => setIsWeightSectionOpen((current) => !current)}
          type="button"
        >
          <span className="rounded-xl bg-brand-50 p-2 text-brand-700 dark:bg-brand-950/40 dark:text-brand-300">
            <Scale aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-lg font-semibold text-slate-950 dark:text-white">
              Pesées fictives synchronisées
            </span>
            <span className="mt-1 block text-sm leading-6 text-slate-600 dark:text-slate-300">
              Ces données servent uniquement au prototype et ne rejoignent
              jamais l’historique réel de SportPilot.
            </span>
          </span>
          {isLoggedIn ? (
            <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
              {snapshot.weights.weights.length} pesée
              {snapshot.weights.weights.length > 1 ? 's' : ''}
            </span>
          ) : null}
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none ${
              isWeightSectionOpen ? 'rotate-180' : ''
            }`}
          />
        </button>

        {isWeightSectionOpen ? (
          <div
            className="border-t border-slate-200 p-5 sm:p-6 dark:border-slate-800"
            id="sync-prototype-weights-content"
          >
            {!isLoggedIn ? (
              <InlineNotice tone="info" title="Connexion requise">
                Connecte le compte de test pour créer et synchroniser des
                pesées fictives.
              </InlineNotice>
            ) : (
              <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
                <form
                  className="scroll-mt-24 space-y-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                  onSubmit={handleWeightSubmit}
                  ref={weightEditorRef}
                >
              <div className="flex items-center justify-between gap-3">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  {editingWeightId
                    ? 'Modifier la pesée fictive'
                    : 'Ajouter une pesée fictive'}
                </h3>
                {editingWeightId ? (
                  <Button
                    aria-label="Annuler la modification"
                    onClick={resetWeightEditor}
                    size="sm"
                    variant="ghost"
                  >
                    <X aria-hidden="true" className="size-4" />
                    Annuler
                  </Button>
                ) : null}
              </div>

              <FormField
                id="sync-prototype-weight-date"
                label="Date"
                required
              >
                <input
                  className={inputClasses}
                  disabled={Boolean(editingWeightId)}
                  id="sync-prototype-weight-date"
                  onChange={(event) =>
                    setWeightDraft((current) => ({
                      ...current,
                      date: event.target.value,
                    }))
                  }
                  type="date"
                  value={weightDraft.date}
                />
              </FormField>

              <FormField
                description="Valeur fictive comprise entre 30 et 350 kg."
                id="sync-prototype-weight-value"
                label="Poids en kilogrammes"
                required
              >
                <input
                  className={inputClasses}
                  id="sync-prototype-weight-value"
                  inputMode="decimal"
                  ref={weightInputRef}
                  max="350"
                  min="30"
                  onChange={(event) =>
                    setWeightDraft((current) => ({
                      ...current,
                      weightKg: event.target.value,
                    }))
                  }
                  placeholder="75,0"
                  step="0.1"
                  type="number"
                  value={weightDraft.weightKg}
                />
              </FormField>

              <FormField
                description="Facultatif, 500 caractères maximum."
                id="sync-prototype-weight-note"
                label="Note de test"
              >
                <textarea
                  className={inputClasses}
                  id="sync-prototype-weight-note"
                  maxLength={500}
                  onChange={(event) =>
                    setWeightDraft((current) => ({
                      ...current,
                      note: event.target.value,
                    }))
                  }
                  rows={3}
                  value={weightDraft.note}
                />
              </FormField>

              <Button
                className="w-full sm:w-auto"
                disabled={
                  actionStatus === 'weight-save' ||
                  !weightDraft.date ||
                  !weightDraft.weightKg
                }
                type="submit"
              >
                {editingWeightId ? (
                  <Pencil aria-hidden="true" className="size-4" />
                ) : (
                  <Plus aria-hidden="true" className="size-4" />
                )}
                {actionStatus === 'weight-save'
                  ? 'Enregistrement…'
                  : editingWeightId
                    ? 'Enregistrer la modification'
                    : 'Ajouter la pesée fictive'}
              </Button>
            </form>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-slate-950 dark:text-white">
                  Données visibles sur ce compte
                </h3>
                <span className="text-xs font-medium text-slate-500 dark:text-slate-400">
                  {snapshot.weights.deletedCount} marqueur
                  {snapshot.weights.deletedCount > 1 ? 's' : ''} de
                  suppression
                </span>
              </div>

              {snapshot.weights.errorMessage ? (
                <InlineNotice
                  className="mt-3"
                  tone="error"
                  title="Chargement impossible"
                >
                  {snapshot.weights.errorMessage}
                </InlineNotice>
              ) : snapshot.weights.isLoading ? (
                <p className="mt-4 text-sm text-slate-500 dark:text-slate-400">
                  Chargement des pesées fictives…
                </p>
              ) : snapshot.weights.weights.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-5 text-center dark:border-slate-700">
                  <p className="font-semibold text-slate-900 dark:text-white">
                    Aucune pesée fictive
                  </p>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    Ajoute une première valeur pour tester la
                    synchronisation entre les appareils.
                  </p>
                </div>
              ) : (
                <ul className="mt-4 space-y-3">
                  {snapshot.weights.weights.map((entry) => (
                    <li
                      className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800"
                      key={entry.id}
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-slate-950 dark:text-white">
                            {entry.weightKg.toFixed(1)} kg
                          </p>
                          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                            {formatLocalDate(entry.date)}
                          </p>
                          {entry.note ? (
                            <p className="mt-2 break-words text-sm text-slate-500 dark:text-slate-400">
                              {entry.note}
                            </p>
                          ) : null}
                        </div>

                        {pendingDeletionId === entry.id ? (
                          <div className="flex flex-col gap-2 sm:items-end">
                            <p className="text-sm font-medium text-red-700 dark:text-red-300">
                              Confirmer la suppression ?
                            </p>
                            <div className="flex gap-2">
                              <Button
                                disabled={
                                  actionStatus === 'weight-delete'
                                }
                                onClick={() =>
                                  void handleWeightDelete(entry.id)
                                }
                                size="sm"
                                variant="danger"
                              >
                                Supprimer
                              </Button>
                              <Button
                                onClick={() =>
                                  setPendingDeletionId(undefined)
                                }
                                size="sm"
                                variant="secondary"
                              >
                                Annuler
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex gap-2 sm:justify-end">
                            <Button
                              aria-label={`Modifier la pesée du ${entry.date}`}
                              onClick={() => handleWeightEdit(entry)}
                              size="sm"
                              variant="secondary"
                            >
                              <Pencil
                                aria-hidden="true"
                                className="size-4"
                              />
                              Modifier
                            </Button>
                            <Button
                              aria-label={`Supprimer la pesée du ${entry.date}`}
                              onClick={() =>
                                setPendingDeletionId(entry.id)
                              }
                              size="sm"
                              variant="dangerGhost"
                            >
                              <Trash2
                                aria-hidden="true"
                                className="size-4"
                              />
                              Supprimer
                            </Button>
                          </div>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
              </div>
            )}
          </div>
        ) : null}
      </Card>

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
              <li>Les vraies pesées exigent un flag distinct et une confirmation.</li>
              <li>Route masquée lorsque le feature flag est désactivé.</li>
              <li>Jetons et clés Dexie Cloud non exposés à l’interface.</li>
            </ul>
          </div>
        </div>
      </Card>

      <ConfirmationDialog
        open={isRealWeightConfirmationOpen}
        title="Synchroniser les vraies pesées ?"
        description="Les pesées locales et cloud vont converger selon leur date de dernière modification. Les suppressions plus récentes restent prioritaires. Cette opération est idempotente et limitée aux pesées."
        confirmLabel="Synchroniser"
        isPending={actionStatus === 'real-weight-sync'}
        onCancel={() => setIsRealWeightConfirmationOpen(false)}
        onConfirm={() => void handleSyncRealWeights()}
      />
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
