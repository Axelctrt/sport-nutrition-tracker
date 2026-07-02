import { Cloud, RefreshCw, UserRoundCog } from 'lucide-react';
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

function resolveClient(): {
  readonly client: SyncPrototypeClient | null;
  readonly errorMessage?: string;
} {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage) return { client: null, errorMessage };
  if (!config.enabled || !config.realAccountPreferencesSyncEnabled) {
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
          : 'La synchronisation du profil et des réglages ne peut pas être initialisée.',
    };
  }
}

function differenceLabel(count: number): string {
  if (count === 0) return 'Le profil et les réglages partageables sont déjà cohérents.';
  return `${count} ${count > 1 ? 'éléments diffèrent' : 'élément diffère'} entre cet appareil et le cloud.`;
}

export function AccountPreferencesSyncSettingsPanel({ client: clientOverride }: Props) {
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
  const accountPreferences = snapshot.realAccountPreferences;
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
    if (!client?.analyzeRealAccountPreferences) return;
    setBusyAction('analyze');
    setFeedback(undefined);
    try {
      const preview = await client.analyzeRealAccountPreferences();
      setFeedback({ tone: 'success', message: differenceLabel(preview.differingEntityCount) });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'L’analyse du profil et des réglages a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  const synchronize = async () => {
    if (!client?.syncRealAccountPreferences) return;
    setConfirmationOpen(false);
    setBusyAction('sync');
    setFeedback(undefined);
    try {
      const result = await client.syncRealAccountPreferences();
      const updated = result.uploadedProfiles + result.downloadedProfiles
        + result.uploadedSettings + result.downloadedSettings;
      setFeedback({
        tone: 'success',
        message: updated === 0
          ? 'Le profil et les réglages partageables étaient déjà à jour.'
          : `${updated} ${updated > 1 ? 'éléments mis à jour' : 'élément mis à jour'}.`,
      });
    } catch (error) {
      setFeedback({
        tone: 'error',
        message: error instanceof Error
          ? error.message
          : 'La synchronisation du profil et des réglages a échoué.',
      });
    } finally {
      setBusyAction(undefined);
    }
  };

  if (!client || !accountPreferences) {
    return (
      <div className="space-y-3">
        <InlineNotice
          tone={runtime.errorMessage ? 'error' : 'info'}
          title={runtime.errorMessage ? 'Profil et réglages indisponibles' : 'Profil et réglages non activés'}
        >
          {runtime.errorMessage ??
            'Le profil et les réglages partageables restent locaux tant que le lot E1 n’est pas activé dans ce déploiement.'}
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

  const unavailable = !client.analyzeRealAccountPreferences || !client.syncRealAccountPreferences;
  const disabled = isInitializing || unavailable || !snapshot.account.isLoggedIn || busyAction !== undefined;

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <UserRoundCog aria-hidden="true" className="size-5 text-brand-700 dark:text-brand-300" />
              <h3 className="font-semibold text-slate-950 dark:text-white">
                Synchronisation du profil et des réglages
              </h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Synchronise le profil, les paramètres de calcul, le tableau de bord et les modèles d’endurance personnalisés.
            </p>
          </div>
          <span className="inline-flex min-h-9 shrink-0 items-center rounded-full bg-slate-100 px-3 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
            {isInitializing
              ? 'Préparation…'
              : accountPreferences.status === 'syncing'
                ? 'Synchronisation…'
                : accountPreferences.status === 'analyzing'
                  ? 'Analyse…'
                  : snapshot.account.isLoggedIn ? 'Prête' : 'Compte non connecté'}
          </span>
        </div>

        {!snapshot.account.isLoggedIn ? (
          <InlineNotice className="mt-4" tone="info" title="Connexion requise">
            Connecte le compte associé à cet espace avant de synchroniser le profil et les réglages.
          </InlineNotice>
        ) : null}

        {accountPreferences.errorMessage ? (
          <InlineNotice className="mt-4" tone="error" title="Erreur de synchronisation">
            {accountPreferences.errorMessage}
          </InlineNotice>
        ) : null}

        {accountPreferences.preview ? (
          <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-5">
            <div><dt className="text-slate-500 dark:text-slate-400">Profil local</dt><dd className="mt-1 font-semibold">{accountPreferences.preview.localProfilePresent ? 'Présent' : 'Absent'}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Profil cloud</dt><dd className="mt-1 font-semibold">{accountPreferences.preview.cloudProfilePresent ? 'Présent' : 'Absent'}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Réglages locaux</dt><dd className="mt-1 font-semibold">{accountPreferences.preview.localSettingsPresent ? 'Présents' : 'Absents'}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Réglages cloud</dt><dd className="mt-1 font-semibold">{accountPreferences.preview.cloudSettingsPresent ? 'Présents' : 'Absents'}</dd></div>
            <div><dt className="text-slate-500 dark:text-slate-400">Éléments différents</dt><dd className="mt-1 font-semibold">{accountPreferences.preview.differingEntityCount}</dd></div>
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
            Synchroniser le profil et les réglages
          </Button>
          <Link
            to={routePaths.accountDevices}
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
          >
            Gérer le compte
          </Link>
        </div>
      </div>

      <InlineNotice tone="info" title="Réglages conservés sur cet appareil">
        Le thème clair ou sombre, le stockage, le minuteur de repos, les sauvegardes et les rappels restent locaux. Les rappels seront traités séparément dans le lot E2.
      </InlineNotice>

      <ConfirmationDialog
        open={confirmationOpen}
        title="Synchroniser le profil et les réglages ?"
        description="La version la plus récente du profil et des réglages partageables sera conservée. Les préférences propres à cet appareil et les rappels ne seront pas modifiés."
        confirmLabel="Synchroniser"
        isPending={busyAction === 'sync'}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => void synchronize()}
      />
    </div>
  );
}
