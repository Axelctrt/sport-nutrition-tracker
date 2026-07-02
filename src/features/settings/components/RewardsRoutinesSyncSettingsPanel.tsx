import { BellRing, Cloud, RefreshCw, Sparkles } from 'lucide-react';
import { useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import {
  readSyncPrototypeConfigSafely,
} from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import { createEmptySyncPrototypeDiagnostics } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface Props {
  readonly client?: SyncPrototypeClient | null;
}

type BusyAction = 'analyze' | 'sync';

function subscribeToNothing(): () => void {
  return () => undefined;
}

const EMPTY_SNAPSHOT: SyncPrototypeSnapshot = {
  account: { isLoggedIn: false, isLoading: false },
  sync: { status: 'not-started', phase: 'initial' },
  weights: { weights: [], deletedCount: 0, isLoading: false },
  diagnostics: createEmptySyncPrototypeDiagnostics(),
};

function getEmptySnapshot(): SyncPrototypeSnapshot {
  return EMPTY_SNAPSHOT;
}

function resolveClient(): {
  readonly client: SyncPrototypeClient | null;
  readonly errorMessage?: string;
} {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage) return { client: null, errorMessage };
  if (!config.enabled || !config.realRewardsRoutinesSyncEnabled) {
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
          : 'La synchronisation des récompenses et rappels ne peut pas être initialisée.',
    };
  }
}

function differenceLabel(count: number): string {
  if (count === 0) {
    return 'Les récompenses, thèmes, missions et rappels sont déjà cohérents.';
  }
  return `${count} ${count > 1 ? 'éléments diffèrent' : 'élément diffère'} entre cet appareil et le cloud.`;
}

export function RewardsRoutinesSyncSettingsPanel({ client: clientOverride }: Props) {
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
  const rewardsRoutines = snapshot.realRewardsRoutines;
  const [busyAction, setBusyAction] = useState<BusyAction>();
  const [isInitializing, setIsInitializing] = useState(Boolean(client));
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [feedback, setFeedback] = useState<
    | { readonly tone: 'success' | 'error'; readonly message: string }
    | undefined
  >();

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
    return () => {
      mounted = false;
    };
  }, [client]);

  const analyze = async () => {
    if (!client?.analyzeRealRewardsRoutines) return;
    setBusyAction('analyze');
    setFeedback(undefined);
    try {
      const preview = await client.analyzeRealRewardsRoutines();
      setFeedback({ tone: 'success', message: differenceLabel(preview.differingEntityCount) });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'L’analyse des récompenses et rappels a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const synchronize = async () => {
    if (!client?.syncRealRewardsRoutines) return;
    setConfirmationOpen(false);
    setBusyAction('sync');
    setFeedback(undefined);
    try {
      const result = await client.syncRealRewardsRoutines();
      const updated =
        result.uploadedAchievements + result.downloadedAchievements +
        result.uploadedThemes + result.downloadedThemes +
        result.uploadedThemePreference + result.downloadedThemePreference +
        result.uploadedWeeklyMissions + result.downloadedWeeklyMissions +
        result.uploadedReminderCompletions + result.downloadedReminderCompletions +
        result.uploadedReminderPreferences + result.downloadedReminderPreferences;
      setFeedback({
        tone: 'success',
        message: updated === 0
          ? 'Les récompenses, thèmes, missions et rappels étaient déjà à jour.'
          : `${updated} ${updated > 1 ? 'éléments mis à jour' : 'élément mis à jour'}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'La synchronisation des récompenses et rappels a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  if (!client || !rewardsRoutines) {
    return (
      <div className="space-y-3">
        <InlineNotice
          tone={runtime.errorMessage ? 'error' : 'info'}
          title={runtime.errorMessage ? 'Récompenses et rappels indisponibles' : 'Récompenses et rappels non activés'}
        >
          {runtime.errorMessage ??
            'Les récompenses, thèmes, missions et rappels restent locaux tant que le lot E2 n’est pas activé dans ce déploiement.'}
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

  const unavailable = !client.analyzeRealRewardsRoutines || !client.syncRealRewardsRoutines;
  const disabled = isInitializing || unavailable || !snapshot.account.isLoggedIn || busyAction !== undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Sparkles aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Synchronisation des récompenses et rappels
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Fusionne les badges, thèmes débloqués, missions hebdomadaires, préférences et complétions de rappels sans retirer de progression.
            </p>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {isInitializing
              ? 'Préparation…'
              : rewardsRoutines.status === 'syncing'
                ? 'Synchronisation…'
                : rewardsRoutines.status === 'analyzing'
                  ? 'Analyse…'
                  : snapshot.account.isLoggedIn ? 'Prête' : 'Compte non connecté'}
          </span>
        </div>

        {!snapshot.account.isLoggedIn ? (
          <InlineNotice className="mt-4" tone="info" title="Connexion requise">
            Connecte le compte associé à cet espace avant de synchroniser les récompenses et rappels.
          </InlineNotice>
        ) : null}

        {rewardsRoutines.errorMessage ? (
          <InlineNotice className="mt-4" tone="error" title="Erreur de synchronisation">
            {rewardsRoutines.errorMessage}
          </InlineNotice>
        ) : null}

        {rewardsRoutines.preview ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
            <div><dt className="text-slate-500 dark:text-slate-400">Badges local / cloud</dt><dd className="mt-1 font-semibold">{rewardsRoutines.preview.localAchievementCount} / {rewardsRoutines.preview.cloudAchievementCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Thèmes local / cloud</dt><dd className="mt-1 font-semibold">{rewardsRoutines.preview.localUnlockedThemeCount} / {rewardsRoutines.preview.cloudUnlockedThemeCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Missions local / cloud</dt><dd className="mt-1 font-semibold">{rewardsRoutines.preview.localWeeklyMissionCount} / {rewardsRoutines.preview.cloudWeeklyMissionCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Rappels terminés local / cloud</dt><dd className="mt-1 font-semibold">{rewardsRoutines.preview.localReminderCompletionCount} / {rewardsRoutines.preview.cloudReminderCompletionCount}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Éléments différents</dt><dd className="mt-1 font-semibold">{rewardsRoutines.preview.differingEntityCount}</dd></div>
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
            Synchroniser les récompenses et rappels
          </Button>
          <Link
            to={routePaths.reminders}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
          >
            <BellRing aria-hidden="true" className="size-4" />
            Configurer les rappels
          </Link>
        </div>
      </div>

      <InlineNotice tone="info" title="Fusion non destructive">
        Les badges, thèmes débloqués, missions et rappels terminés sont réunis entre les appareils. La date d’obtention la plus ancienne est conservée. Le thème visuel actif et les préférences de rappels suivent leur modification la plus récente. Le mode clair ou sombre reste propre à chaque appareil.
      </InlineNotice>

      <ConfirmationDialog
        open={confirmationOpen}
        title="Synchroniser les récompenses et rappels ?"
        description="La progression des deux côtés sera fusionnée sans retirer de badge, de thème, de mission ou de rappel terminé. Les préférences les plus récentes seront conservées."
        confirmLabel="Synchroniser"
        isPending={busyAction === 'sync'}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void synchronize()}
      />
    </div>
  );
}
