import { Target, Cloud, RefreshCw, ShieldAlert } from 'lucide-react';
import {
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { Link } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfigSafely } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import {
  applyRegisteredRealGoalInitialReconciliation,
  prepareRegisteredRealGoalInitialReconciliation,
  type GoalInitialReconciliationChoice,
  type GoalReconciliationSideStatus,
  type PreparedRealGoalReconciliation,
  type RealGoalSyncResult,
} from '@/infrastructure/sync-prototype/realGoalSyncService';
import {
  applyRegisteredRealGoalConcurrentReconciliation,
  prepareRegisteredRealGoalConcurrentReconciliation,
} from '@/infrastructure/sync-prototype/registeredGoalConcurrentResolutionService';
import type {
  GoalConcurrentReconciliationChoice,
  PreparedRealGoalConcurrentReconciliation,
} from '@/infrastructure/sync-prototype/realGoalConcurrentResolutionService';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface GoalSyncSettingsPanelProps {
  readonly client?: SyncPrototypeClient | null;
  readonly prepareInitialReconciliation?: (
    currentUserId: string,
  ) => Promise<PreparedRealGoalReconciliation>;
  readonly applyInitialReconciliation?: (
    currentUserId: string,
    prepared: PreparedRealGoalReconciliation,
    choice: GoalInitialReconciliationChoice,
  ) => Promise<RealGoalSyncResult>;
  readonly prepareConcurrentReconciliation?: (
    currentUserId: string,
  ) => Promise<PreparedRealGoalConcurrentReconciliation>;
  readonly applyConcurrentReconciliation?: (
    currentUserId: string,
    prepared: PreparedRealGoalConcurrentReconciliation,
    choice: GoalConcurrentReconciliationChoice,
  ) => Promise<RealGoalSyncResult>;
}

type BusyAction = 'analyze' | 'sync' | 'reconcile-prepare' | 'reconcile-apply';
type GoalResolutionChoice = GoalInitialReconciliationChoice;
type PreparedReconciliation =
  | {
      readonly kind: 'initial';
      readonly value: PreparedRealGoalReconciliation;
    }
  | {
      readonly kind: 'concurrent';
      readonly value: PreparedRealGoalConcurrentReconciliation;
    };

const EMPTY_SYNC_SNAPSHOT: SyncPrototypeSnapshot = {
  account: { isLoggedIn: false, isLoading: false },
  sync: { status: 'not-started', phase: 'initial' },
  weights: { weights: [], deletedCount: 0, isLoading: false },
  diagnostics: createEmptySyncPrototypeDiagnostics(),
};

const subscribeToNothing = (): (() => void) => () => undefined;
const getEmptySnapshot = (): SyncPrototypeSnapshot => EMPTY_SYNC_SNAPSHOT;

function resolveClient(): {
  readonly client: SyncPrototypeClient | null;
  readonly errorMessage?: string;
} {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage) return { client: null, errorMessage };
  if (!config.enabled || !config.realGoalSyncEnabled) {
    return { client: null };
  }

  try {
    return { client: getSyncPrototypeClient() };
  } catch (error) {
    return {
      client: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : 'La synchronisation des objectifs ne peut pas être initialisée.',
    };
  }
}

function plural(value: number, singular: string, pluralForm: string): string {
  return value > 1 ? pluralForm : singular;
}

function provenanceLabel(origin: 'local' | 'cloud' | 'both' | 'unknown' | undefined): string {
  switch (origin) {
    case 'local':
      return 'local — cet appareil';
    case 'cloud':
      return 'cloud — cloud';
    case 'both':
      return 'both — modifications des deux côtés';
    case 'unknown':
      return 'unknown — origine indéterminée';
    default:
      return 'non déterminée';
  }
}

function reconciliationStatusLabel(status: GoalReconciliationSideStatus): string {
  switch (status) {
    case 'present':
      return 'Présent';
    case 'modified':
      return 'Modifié';
    case 'deleted':
      return 'Supprimé';
    case 'absent':
      return 'Absent';
  }
}

export function GoalSyncSettingsPanel({
  client: clientOverride,
  prepareInitialReconciliation = prepareRegisteredRealGoalInitialReconciliation,
  applyInitialReconciliation = applyRegisteredRealGoalInitialReconciliation,
  prepareConcurrentReconciliation = prepareRegisteredRealGoalConcurrentReconciliation,
  applyConcurrentReconciliation = applyRegisteredRealGoalConcurrentReconciliation,
}: GoalSyncSettingsPanelProps) {
  const runtime = useMemo(
    () =>
      clientOverride === undefined
        ? resolveClient()
        : { client: clientOverride },
    [clientOverride],
  );
  const client = runtime.client;
  const snapshot = useSyncExternalStore(
    client?.subscribe ?? subscribeToNothing,
    client?.getSnapshot ?? getEmptySnapshot,
    client?.getSnapshot ?? getEmptySnapshot,
  );
  const goalSnapshot = snapshot.realGoals;
  const [busyAction, setBusyAction] = useState<BusyAction>();
  const [isInitializing, setIsInitializing] = useState(Boolean(client));
  const [feedback, setFeedback] = useState<
    | { readonly tone: 'success' | 'error'; readonly message: string }
    | undefined
  >();
  const [syncConfirmationOpen, setSyncConfirmationOpen] = useState(false);
  const [preparedReconciliation, setPreparedReconciliation] =
    useState<PreparedReconciliation>();
  const [reconciliationChoice, setReconciliationChoice] =
    useState<GoalResolutionChoice>();

  useEffect(() => {
    if (!client) {
      setIsInitializing(false);
      return;
    }

    let mounted = true;
    void client
      .initialize()
      .catch((error: unknown) => {
        if (!mounted) return;
        setFeedback({
          tone: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Le compte de synchronisation n’a pas pu être chargé.',
        });
      })
      .finally(() => {
        if (mounted) setIsInitializing(false);
      });

    return () => {
      mounted = false;
    };
  }, [client]);

  const analyze = async () => {
    if (!client?.analyzeRealGoals) return;
    setFeedback(undefined);
    setPreparedReconciliation(undefined);
    setBusyAction('analyze');
    try {
      const preview = await client.analyzeRealGoals();
      setFeedback({
        tone: 'success',
        message:
          preview.differingEntityCount === 0
            ? 'Les objectifs locaux et cloud sont déjà cohérents.'
            : `${preview.differingEntityCount} ${plural(
                preview.differingEntityCount,
                'objectif diffère',
                'objectifs diffèrent',
              )} entre cet appareil et le cloud.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'L’analyse des objectifs a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const synchronize = async () => {
    if (!client?.syncRealGoals) return;
    setSyncConfirmationOpen(false);
    setFeedback(undefined);
    setBusyAction('sync');
    try {
      const result = await client.syncRealGoals();
      const writes = result.uploadedGoals + result.downloadedGoals;
      const removals = result.removedLocalGoals + result.removedCloudGoals;
      setFeedback({
        tone: 'success',
        message: `${writes} ${plural(
          writes,
          'objectif mis à jour',
          'objectifs mis à jour',
        )} et ${removals} ${plural(
          removals,
          'suppression appliquée',
          'suppressions appliquées',
        )}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'La synchronisation des objectifs a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const currentUserIdOrFeedback = (): string | undefined => {
    const currentUserId = snapshot.account.userId;
    if (!currentUserId) {
      setFeedback({
        tone: 'error',
        message: 'Le compte actif doit être identifié avant de résoudre les objectifs.',
      });
      return undefined;
    }
    return currentUserId;
  };

  const prepareInitial = async () => {
    const currentUserId = currentUserIdOrFeedback();
    if (!currentUserId) return;
    setFeedback(undefined);
    setBusyAction('reconcile-prepare');
    try {
      const prepared = await prepareInitialReconciliation(currentUserId);
      setPreparedReconciliation({ kind: 'initial', value: prepared });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'L’aperçu de première réconciliation n’a pas pu être préparé.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const prepareConcurrent = async () => {
    const currentUserId = currentUserIdOrFeedback();
    if (!currentUserId) return;
    setFeedback(undefined);
    setBusyAction('reconcile-prepare');
    try {
      const prepared = await prepareConcurrentReconciliation(currentUserId);
      setPreparedReconciliation({ kind: 'concurrent', value: prepared });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'L’aperçu du conflit Goals n’a pas pu être préparé.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const applyReconciliation = async () => {
    const currentUserId = snapshot.account.userId;
    const prepared = preparedReconciliation;
    const choice = reconciliationChoice;
    setReconciliationChoice(undefined);
    if (!currentUserId || !prepared || !choice) return;

    setFeedback(undefined);
    setBusyAction('reconcile-apply');
    try {
      if (prepared.kind === 'initial') {
        await applyInitialReconciliation(currentUserId, prepared.value, choice);
      } else {
        await applyConcurrentReconciliation(currentUserId, prepared.value, choice);
      }
      setPreparedReconciliation(undefined);
      await client?.syncNow();
      await client?.analyzeRealGoals?.();
      setFeedback({
        tone: 'success',
        message:
          prepared.kind === 'initial'
            ? 'Les objectifs sont réconciliés. Cet appareil et le cloud utilisent maintenant la même référence.'
            : 'Le conflit des objectifs est résolu. Cet appareil et le cloud convergent de nouveau sur une même référence.',
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'La résolution des objectifs a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  if (!client || !goalSnapshot) {
    return (
      <div className="space-y-3">
        <InlineNotice
          tone={runtime.errorMessage ? 'error' : 'info'}
          title={
            runtime.errorMessage
              ? 'Synchronisation des objectifs indisponible'
              : 'Synchronisation sportive non activée'
          }
        >
          {runtime.errorMessage ??
            'Les objectifs restent locaux tant que le lot de synchronisation sportive n’est pas activé dans ce déploiement.'}
        </InlineNotice>
        <Link
          to={routePaths.accountDevices}
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
        >
          Gérer le compte de synchronisation
        </Link>
      </div>
    );
  }

  const preview = goalSnapshot.preview;
  const origin = preview?.changeOrigin;
  const directional = origin === 'local' || origin === 'cloud';
  const unavailable = !client.analyzeRealGoals;
  const disabled =
    isInitializing ||
    unavailable ||
    !snapshot.account.isLoggedIn ||
    busyAction !== undefined;
  const prepared = preparedReconciliation?.value;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Target
                aria-hidden="true"
                className="size-5 text-brand-700 dark:text-brand-300"
              />
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Synchronisation des objectifs
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Vérifie les objectifs du compte et applique uniquement une direction dont l’origine est démontrée. Les conflits des deux côtés exigent toujours un choix manuel explicite.
            </p>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {isInitializing
              ? 'Préparation…'
              : goalSnapshot.status === 'syncing'
                ? 'Synchronisation…'
                : goalSnapshot.status === 'analyzing'
                  ? 'Analyse…'
                  : snapshot.account.isLoggedIn
                    ? 'Prête'
                    : 'Compte non connecté'}
          </span>
        </div>

        {!snapshot.account.isLoggedIn ? (
          <InlineNotice className="mt-4" tone="info" title="Connexion requise">
            Connecte le compte associé à cet espace avant de synchroniser les objectifs.
          </InlineNotice>
        ) : null}

        {goalSnapshot.errorMessage ? (
          <InlineNotice className="mt-4" tone="error" title="Erreur de synchronisation">
            {goalSnapshot.errorMessage}
          </InlineNotice>
        ) : null}

        {preview ? (
          <>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-6">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Objectifs locaux</dt>
                <dd className="mt-1 font-semibold">{preview.localGoalCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Objectifs cloud</dt>
                <dd className="mt-1 font-semibold">{preview.cloudGoalCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Suppressions locales</dt>
                <dd className="mt-1 font-semibold">{preview.localDeletionCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Suppressions cloud</dt>
                <dd className="mt-1 font-semibold">{preview.cloudDeletionCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Éléments différents</dt>
                <dd className="mt-1 font-semibold">{preview.differingEntityCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Provenance</dt>
                <dd className="mt-1 font-semibold">{provenanceLabel(origin)}</dd>
              </div>
            </dl>

            {origin === 'unknown' ? (
              <InlineNotice className="mt-4" tone="info" title="Première réconciliation requise">
                SportPilot détecte des objectifs différents sur cet appareil et dans le cloud, mais aucune référence antérieure ne permet de choisir automatiquement. Aucune donnée ne sera remplacée sans ton choix explicite.
              </InlineNotice>
            ) : null}

            {origin === 'both' ? (
              <InlineNotice className="mt-4" tone="info" title="Modifications des deux côtés">
                Des modifications ont été détectées sur cet appareil et dans le cloud depuis la dernière référence. La synchronisation automatique et l’action globale restent bloquées ; seule la résolution manuelle ci-dessous peut choisir une source.
              </InlineNotice>
            ) : null}
          </>
        ) : null}

        {feedback ? (
          <InlineNotice
            className="mt-4"
            tone={feedback.tone}
            title={
              feedback.tone === 'success'
                ? 'Opération terminée'
                : 'Opération impossible'
            }
          >
            {feedback.message}
          </InlineNotice>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="secondary"
            disabled={disabled}
            onClick={() => void analyze()}
          >
            <RefreshCw
              aria-hidden="true"
              className={busyAction === 'analyze' ? 'size-4 animate-spin' : 'size-4'}
            />
            {busyAction === 'analyze' ? 'Analyse…' : 'Analyser sans modifier'}
          </Button>

          {directional && client.syncRealGoals ? (
            <Button
              disabled={disabled}
              onClick={() => setSyncConfirmationOpen(true)}
            >
              <Cloud aria-hidden="true" className="size-4" />
              Synchroniser les objectifs
            </Button>
          ) : null}

          {origin === 'unknown' ? (
            <Button
              disabled={disabled}
              onClick={() => void prepareInitial()}
            >
              <ShieldAlert aria-hidden="true" className="size-4" />
              {busyAction === 'reconcile-prepare'
                ? 'Préparation…'
                : 'Réconcilier les objectifs'}
            </Button>
          ) : null}

          {origin === 'both' ? (
            <Button
              disabled={disabled}
              onClick={() => void prepareConcurrent()}
            >
              <ShieldAlert aria-hidden="true" className="size-4" />
              {busyAction === 'reconcile-prepare'
                ? 'Préparation…'
                : 'Résoudre le conflit des objectifs'}
            </Button>
          ) : null}

          <Link
            to={routePaths.accountDevices}
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
          >
            Gérer le compte
          </Link>
        </div>
      </div>

      {prepared ? (
        <section
          aria-labelledby="goal-reconciliation-preview-title"
          className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20"
        >
          <h4
            id="goal-reconciliation-preview-title"
            className="font-semibold text-slate-950 dark:text-white"
          >
            {preparedReconciliation?.kind === 'initial'
              ? 'Aperçu avant première réconciliation'
              : 'Aperçu avant résolution du conflit'}
          </h4>
          <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
            Le choix reste global pour les Objectifs. Vérifie chaque différence avant de décider quelle source devient la référence.
          </p>

          <ul className="mt-4 space-y-3">
            {prepared.items.map((item) => (
              <li
                key={item.id}
                className="rounded-xl border border-amber-200 bg-white p-3 dark:border-amber-900/70 dark:bg-slate-950"
              >
                <p className="font-semibold text-slate-950 dark:text-white">{item.title}</p>
                <dl className="mt-2 grid gap-2 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Cet appareil</dt>
                    <dd className="font-semibold">{reconciliationStatusLabel(item.localStatus)}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500 dark:text-slate-400">Cloud</dt>
                    <dd className="font-semibold">{reconciliationStatusLabel(item.cloudStatus)}</dd>
                  </div>
                </dl>
                <div className="mt-3 space-y-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                  <p><strong>Si tu conserves cet appareil :</strong> {item.keepLocalConsequence}</p>
                  <p><strong>Si tu utilises le cloud :</strong> {item.useCloudConsequence}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <Button
              disabled={busyAction !== undefined}
              onClick={() => setReconciliationChoice('keep-local')}
            >
              Conserver cet appareil
            </Button>
            <Button
              variant="secondary"
              disabled={busyAction !== undefined}
              onClick={() => setReconciliationChoice('use-cloud')}
            >
              Utiliser le cloud
            </Button>
          </div>
        </section>
      ) : null}

      <ConfirmationDialog
        open={syncConfirmationOpen}
        title="Synchroniser les objectifs ?"
        description={
          origin === 'local'
            ? 'La modification a été identifiée comme locale. Seule la direction cet appareil vers le cloud est autorisée.'
            : 'La modification a été identifiée comme distante. Seule la direction cloud vers cet appareil est autorisée.'
        }
        confirmLabel="Synchroniser"
        isPending={busyAction === 'sync'}
        onCancel={() => setSyncConfirmationOpen(false)}
        onConfirm={() => void synchronize()}
      />

      <ConfirmationDialog
        open={Boolean(reconciliationChoice)}
        title={
          reconciliationChoice === 'keep-local'
            ? 'Conserver les objectifs de cet appareil ?'
            : 'Utiliser les objectifs du cloud ?'
        }
        description={
          preparedReconciliation?.kind === 'concurrent'
            ? reconciliationChoice === 'keep-local'
              ? 'Les objectifs visibles dans l’aperçu de cet appareil remplaceront la version cloud du conflit. SportPilot revalidera le compte, la référence et les deux états juste avant l’écriture.'
              : 'Les objectifs visibles dans l’aperçu cloud remplaceront la version de cet appareil. SportPilot revalidera le compte, la référence et les deux états juste avant l’écriture.'
            : reconciliationChoice === 'keep-local'
              ? 'Les objectifs et suppressions visibles dans l’aperçu de cet appareil deviendront la première référence Goals du compte. Si les données ont changé depuis l’aperçu, SportPilot annulera avant toute validation.'
              : 'Les objectifs et suppressions visibles dans l’aperçu cloud deviendront la première référence Goals sur cet appareil. Si les données ont changé depuis l’aperçu, SportPilot annulera avant toute validation.'
        }
        confirmLabel={
          reconciliationChoice === 'keep-local'
            ? 'Conserver cet appareil'
            : 'Utiliser le cloud'
        }
        isPending={busyAction === 'reconcile-apply'}
        onCancel={() => setReconciliationChoice(undefined)}
        onConfirm={() => void applyReconciliation()}
      />
    </div>
  );
}
