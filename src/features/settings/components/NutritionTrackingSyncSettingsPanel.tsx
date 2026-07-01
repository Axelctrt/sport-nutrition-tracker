import { CalendarRange, Cloud, RefreshCw } from 'lucide-react';
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

interface Props {
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

function resolveClient(): { readonly client: SyncPrototypeClient | null; readonly errorMessage?: string } {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage) return { client: null, errorMessage };
  if (!config.enabled || !config.realNutritionTrackingSyncEnabled) return { client: null };
  try {
    return { client: getSyncPrototypeClient() };
  } catch (error) {
    return {
      client: null,
      errorMessage: error instanceof Error
        ? error.message
        : 'La synchronisation du suivi nutritionnel ne peut pas être initialisée.',
    };
  }
}

function plural(value: number, singular: string, pluralForm: string): string {
  return value > 1 ? pluralForm : singular;
}

export function NutritionTrackingSyncSettingsPanel({ client: clientOverride }: Props) {
  const runtime = useMemo(
    () => clientOverride === undefined ? resolveClient() : { client: clientOverride },
    [clientOverride],
  );
  const client = runtime.client;
  const snapshot = useSyncExternalStore(
    client?.subscribe ?? subscribeToNothing,
    client?.getSnapshot ?? getEmptySnapshot,
    client?.getSnapshot ?? getEmptySnapshot,
  );
  const tracking = snapshot.realNutritionTracking;
  const [busyAction, setBusyAction] = useState<BusyAction>();
  const [isInitializing, setIsInitializing] = useState(Boolean(client));
  const [feedback, setFeedback] = useState<
    { readonly tone: 'success' | 'error'; readonly message: string } | undefined
  >();
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!client) {
      setIsInitializing(false);
      return;
    }
    let mounted = true;
    void client.initialize()
      .catch((error: unknown) => {
        if (!mounted) return;
        setFeedback({
          tone: 'error',
          message: error instanceof Error
            ? error.message
            : 'Le compte de synchronisation n’a pas pu être chargé.',
        });
      })
      .finally(() => {
        if (mounted) setIsInitializing(false);
      });
    return () => { mounted = false; };
  }, [client]);

  const analyze = async () => {
    if (!client?.analyzeRealNutritionTracking) return;
    setFeedback(undefined);
    setBusyAction('analyze');
    try {
      const preview = await client.analyzeRealNutritionTracking();
      setFeedback({
        tone: 'success',
        message: preview.differingEntityCount === 0
          ? 'Le suivi nutritionnel local et cloud est déjà cohérent.'
          : `${preview.differingEntityCount} ${plural(preview.differingEntityCount, 'élément diffère', 'éléments diffèrent')} entre cet appareil et le cloud.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'L’analyse du suivi nutritionnel a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const synchronize = async () => {
    if (!client?.syncRealNutritionTracking) return;
    setConfirmationOpen(false);
    setFeedback(undefined);
    setBusyAction('sync');
    try {
      const result = await client.syncRealNutritionTracking();
      const writes = result.uploadedReviews + result.downloadedReviews;
      setFeedback({
        tone: 'success',
        message: `${writes} ${plural(writes, 'bilan mis à jour', 'bilans mis à jour')} et ${result.recalculatedDailyTargets} ${plural(result.recalculatedDailyTargets, 'objectif quotidien recalculé', 'objectifs quotidiens recalculés')}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'La synchronisation du suivi nutritionnel a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  if (!client || !tracking) {
    return (
      <div className="space-y-3">
        <InlineNotice
          tone={runtime.errorMessage ? 'error' : 'info'}
          title={runtime.errorMessage ? 'Suivi nutritionnel indisponible' : 'Suivi nutritionnel non activé'}
        >
          {runtime.errorMessage ?? 'Les bilans hebdomadaires et ajustements caloriques restent locaux tant que le lot C3 n’est pas activé.'}
        </InlineNotice>
        <Link
          to={routePaths.syncPrototype}
          className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
        >
          Gérer le compte de synchronisation
        </Link>
      </div>
    );
  }

  const unavailable = !client.analyzeRealNutritionTracking || !client.syncRealNutritionTracking;
  const disabled = isInitializing || unavailable || !snapshot.account.isLoggedIn || busyAction !== undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CalendarRange aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Synchronisation du suivi nutritionnel
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Synchronise les bilans hebdomadaires, décisions et ajustements caloriques acceptés.
            </p>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {isInitializing ? 'Préparation…' : tracking.status === 'syncing' ? 'Synchronisation…' : tracking.status === 'analyzing' ? 'Analyse…' : snapshot.account.isLoggedIn ? 'Prête' : 'Compte non connecté'}
          </span>
        </div>

        {!snapshot.account.isLoggedIn ? (
          <InlineNotice className="mt-4" tone="info" title="Connexion requise">
            Connecte le compte associé à cet espace avant de synchroniser le suivi nutritionnel.
          </InlineNotice>
        ) : null}

        {tracking.errorMessage ? (
          <InlineNotice className="mt-4" tone="error" title="Erreur de synchronisation">
            {tracking.errorMessage}
          </InlineNotice>
        ) : null}

        {tracking.preview ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
            <div><dt className="text-slate-500 dark:text-slate-400">Bilans locaux</dt><dd className="mt-1 font-semibold">{tracking.preview.localReviewCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Bilans cloud</dt><dd className="mt-1 font-semibold">{tracking.preview.cloudReviewCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Ajustements locaux</dt><dd className="mt-1 font-semibold">{tracking.preview.localAdjustmentCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Ajustements cloud</dt><dd className="mt-1 font-semibold">{tracking.preview.cloudAdjustmentCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Éléments différents</dt><dd className="mt-1 font-semibold">{tracking.preview.differingEntityCount}</dd></div>
          </dl>
        ) : null}

        {feedback ? (
          <InlineNotice className="mt-4" tone={feedback.tone} title={feedback.tone === 'success' ? 'Opération terminée' : 'Opération impossible'}>
            {feedback.message}
          </InlineNotice>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button variant="secondary" disabled={disabled} onClick={() => void analyze()}>
            <RefreshCw aria-hidden="true" className={busyAction === 'analyze' ? 'size-4 animate-spin' : 'size-4'} />
            {busyAction === 'analyze' ? 'Analyse…' : 'Analyser sans modifier'}
          </Button>
          <Button disabled={disabled} onClick={() => setConfirmationOpen(true)}>
            <Cloud aria-hidden="true" className="size-4" />
            Synchroniser le suivi nutritionnel
          </Button>
          <Link
            to={routePaths.syncPrototype}
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
          >
            Gérer le compte
          </Link>
        </div>
      </div>

      <p className="text-sm leading-6 text-slate-600 dark:text-slate-300">
        Les objectifs quotidiens déjà enregistrés sont recalculés lorsqu’un ajustement reçu modifie leur cumul de calibration.
      </p>

      <ConfirmationDialog
        open={confirmationOpen}
        title="Synchroniser le suivi nutritionnel ?"
        description="Les bilans et leurs ajustements seront appliqués ensemble. Les objectifs quotidiens devenus obsolètes seront recalculés puis propagés via le journal nutritionnel."
        confirmLabel="Synchroniser"
        isPending={busyAction === 'sync'}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void synchronize()}
      />
    </div>
  );
}
