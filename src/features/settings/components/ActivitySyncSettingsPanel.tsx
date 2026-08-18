import { Activity, Cloud, RefreshCw } from 'lucide-react';
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
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface ActivitySyncSettingsPanelProps {
  readonly client?: SyncPrototypeClient | null;
}

type BusyAction = 'analyze' | 'sync';

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
  if (!config.enabled || !config.realActivitySyncEnabled) {
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
          : 'La synchronisation des activités ne peut pas être initialisée.',
    };
  }
}

function plural(value: number, singular: string, pluralForm: string): string {
  return value > 1 ? pluralForm : singular;
}

function provenanceLabel(
  origin: 'local' | 'cloud' | 'both' | 'unknown' | undefined,
): string {
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

export function ActivitySyncSettingsPanel({
  client: clientOverride,
}: ActivitySyncSettingsPanelProps) {
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
  const activitySnapshot = snapshot.realActivities;
  const [busyAction, setBusyAction] = useState<BusyAction>();
  const [isInitializing, setIsInitializing] = useState(Boolean(client));
  const [feedback, setFeedback] = useState<
    | { readonly tone: 'success' | 'error'; readonly message: string }
    | undefined
  >();
  const [confirmationOpen, setConfirmationOpen] = useState(false);

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
    if (!client?.analyzeRealActivities) return;
    setFeedback(undefined);
    setBusyAction('analyze');
    try {
      const preview = await client.analyzeRealActivities();
      setFeedback({
        tone: 'success',
        message:
          preview.differingEntityCount === 0
            ? 'Les activités et le planning endurance sont déjà cohérents avec le cloud.'
            : `${preview.differingEntityCount} ${plural(
                preview.differingEntityCount,
                'élément diffère',
                'éléments diffèrent',
              )} entre cet appareil et le cloud.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'L’analyse des activités a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const synchronize = async () => {
    if (!client?.syncRealActivities) return;
    setConfirmationOpen(false);
    setFeedback(undefined);
    setBusyAction('sync');
    try {
      const result = await client.syncRealActivities();
      const activityWrites =
        result.uploadedActivities + result.downloadedActivities;
      const planningWrites =
        (result.uploadedEndurancePlanningSessions ?? 0)
        + (result.downloadedEndurancePlanningSessions ?? 0);
      const removals =
        result.removedLocalActivities
        + result.removedCloudActivities
        + (result.removedLocalEndurancePlanningSessions ?? 0)
        + (result.removedCloudEndurancePlanningSessions ?? 0);
      setFeedback({
        tone: 'success',
        message: `${activityWrites} ${plural(
          activityWrites,
          'activité mise à jour',
          'activités mises à jour',
        )}, ${planningWrites} ${plural(
          planningWrites,
          'séance planifiée mise à jour',
          'séances planifiées mises à jour',
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
            : 'La synchronisation des activités a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  if (!client || !activitySnapshot) {
    return (
      <div className="space-y-3">
        <InlineNotice
          tone={runtime.errorMessage ? 'error' : 'info'}
          title={
            runtime.errorMessage
              ? 'Synchronisation des activités indisponible'
              : 'Synchronisation sportive non activée'
          }
        >
          {runtime.errorMessage ??
            'Les activités restent locales tant que le lot de synchronisation sportive n’est pas activé dans ce déploiement.'}
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

  const preview = activitySnapshot.preview;
  const origin = preview?.changeOrigin;
  const directional = origin === 'local' || origin === 'cloud';
  const unavailable =
    !client.analyzeRealActivities || !client.syncRealActivities;
  const disabled =
    isInitializing ||
    unavailable ||
    !snapshot.account.isLoggedIn ||
    busyAction !== undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Activity
                aria-hidden="true"
                className="size-5 text-brand-700 dark:text-brand-300"
              />
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Synchronisation des activités
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Vérifie ensemble les activités réalisées, leur lien éventuel avec le planning et les séances d’endurance planifiées. Une écriture n’est autorisée que si sa provenance est démontrée.
            </p>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {isInitializing
              ? 'Préparation…'
              : activitySnapshot.status === 'syncing'
                ? 'Synchronisation…'
                : activitySnapshot.status === 'analyzing'
                  ? 'Analyse…'
                  : snapshot.account.isLoggedIn
                    ? 'Prête'
                    : 'Compte non connecté'}
          </span>
        </div>

        {!snapshot.account.isLoggedIn ? (
          <InlineNotice className="mt-4" tone="info" title="Connexion requise">
            Connecte le compte associé à cet espace avant de synchroniser les activités.
          </InlineNotice>
        ) : null}

        {activitySnapshot.errorMessage ? (
          <InlineNotice className="mt-4" tone="error" title="Erreur de synchronisation">
            {activitySnapshot.errorMessage}
          </InlineNotice>
        ) : null}

        {preview ? (
          <>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-7">
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Activités locales</dt>
                <dd className="mt-1 font-semibold">{preview.localActivityCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Activités cloud</dt>
                <dd className="mt-1 font-semibold">{preview.cloudActivityCount}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Planning local</dt>
                <dd className="mt-1 font-semibold">{preview.localEndurancePlanningCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Planning cloud</dt>
                <dd className="mt-1 font-semibold">{preview.cloudEndurancePlanningCount ?? 0}</dd>
              </div>
              <div>
                <dt className="text-slate-500 dark:text-slate-400">Suppressions locales</dt>
                <dd className="mt-1 font-semibold">{preview.localDeletionCount}</dd>
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
              <InlineNotice className="mt-4" tone="info" title="Origine indéterminée">
                Les deux côtés diffèrent sans référence antérieure fiable. SportPilot analyse la situation mais n’écrit rien automatiquement ni manuellement dans cet état.
              </InlineNotice>
            ) : null}

            {origin === 'both' ? (
              <InlineNotice className="mt-4" tone="info" title="Modifications des deux côtés">
                Le planning ou les activités ont changé sur cet appareil et dans le cloud depuis la dernière référence. Aucune direction n’est choisie et aucune écriture n’est autorisée.
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
          {directional ? (
            <Button
              disabled={disabled}
              onClick={() => setConfirmationOpen(true)}
            >
              <Cloud aria-hidden="true" className="size-4" />
              Synchroniser les activités
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

      <ConfirmationDialog
        open={confirmationOpen}
        title="Synchroniser les activités ?"
        description={
          origin === 'local'
            ? 'La modification a été identifiée comme locale. Seule la direction cet appareil vers le cloud est autorisée pour les activités et le planning endurance.'
            : 'La modification a été identifiée comme distante. Seule la direction cloud vers cet appareil est autorisée pour les activités et le planning endurance.'
        }
        confirmLabel="Synchroniser"
        isPending={busyAction === 'sync'}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void synchronize()}
      />
    </div>
  );
}
