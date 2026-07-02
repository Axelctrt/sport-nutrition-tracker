import { CloudDownload, RefreshCw, ShieldCheck } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  CloudAccountRestoreResult,
  PreparedCloudAccountRestore,
} from '@/infrastructure/data-spaces/cloudAccountRestoreService';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';

interface CloudAccountRestorePanelProps {
  readonly accountFingerprint: string;
  readonly client: SyncPrototypeClient;
  readonly preparedRestore?: PreparedCloudAccountRestore;
  readonly autoAnalyze?: boolean;
  readonly compact?: boolean;
  readonly reload?: () => void;
  readonly onAnalysisChange?: (
    status: 'loading' | 'ready' | 'error',
    prepared?: PreparedCloudAccountRestore,
  ) => void;
  readonly onRestored?: (
    result: CloudAccountRestoreResult,
  ) => Promise<void> | void;
}

type PanelState =
  | { readonly status: 'idle' }
  | { readonly status: 'loading' }
  | { readonly status: 'ready'; readonly prepared: PreparedCloudAccountRestore }
  | { readonly status: 'restoring'; readonly prepared: PreparedCloudAccountRestore }
  | { readonly status: 'success'; readonly result: CloudAccountRestoreResult }
  | { readonly status: 'error'; readonly message: string };

function defaultReload(): void {
  window.location.reload();
}

function errorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : 'La restauration cloud n’a pas pu être terminée.';
}

export function CloudAccountRestorePanel({
  accountFingerprint,
  client,
  preparedRestore,
  autoAnalyze = false,
  compact = false,
  reload = defaultReload,
  onAnalysisChange,
  onRestored,
}: CloudAccountRestorePanelProps) {
  const [state, setState] = useState<PanelState>(() =>
    preparedRestore
      ? { status: 'ready', prepared: preparedRestore }
      : { status: 'idle' },
  );
  const [confirmationOpen, setConfirmationOpen] = useState(false);

  useEffect(() => {
    if (!preparedRestore) return;
    setState({ status: 'ready', prepared: preparedRestore });
  }, [preparedRestore]);

  const prepare = useMemo(() => {
    if (!client.prepareCloudRestore) return undefined;
    return (fingerprint: string) => client.prepareCloudRestore!(fingerprint);
  }, [client]);

  const apply = useMemo(() => {
    if (!client.applyCloudRestore) return undefined;
    return (prepared: PreparedCloudAccountRestore) =>
      client.applyCloudRestore!(prepared);
  }, [client]);

  const analyze = useCallback(async () => {
    if (!prepare) {
      const message = 'La restauration cloud n’est pas disponible dans cette version.';
      setState({ status: 'error', message });
      onAnalysisChange?.('error');
      return;
    }

    setState({ status: 'loading' });
    onAnalysisChange?.('loading');
    try {
      const prepared = await prepare(accountFingerprint);
      setState({ status: 'ready', prepared });
      onAnalysisChange?.('ready', prepared);
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
      onAnalysisChange?.('error');
    }
  }, [accountFingerprint, onAnalysisChange, prepare]);

  useEffect(() => {
    if (!autoAnalyze || preparedRestore || state.status !== 'idle') return;
    void analyze();
  }, [analyze, autoAnalyze, preparedRestore, state.status]);

  const restore = async (prepared: PreparedCloudAccountRestore) => {
    if (!apply) {
      setState({
        status: 'error',
        message: 'La restauration cloud n’est pas disponible dans cette version.',
      });
      return;
    }

    setState({ status: 'restoring', prepared });
    try {
      const result = await apply(prepared);
      setState({ status: 'success', result });
      await onRestored?.(result);
      reload();
    } catch (error) {
      setState({ status: 'error', message: errorMessage(error) });
    }
  };

  const prepared =
    state.status === 'ready' || state.status === 'restoring'
      ? state.prepared
      : undefined;
  const preview = prepared?.preview;

  return (
    <section
      className={
        compact
          ? 'rounded-2xl border border-sky-200 p-4 dark:border-sky-900'
          : 'space-y-4'
      }
    >
      <div className="flex items-start gap-3">
        <CloudDownload
          aria-hidden="true"
          className="mt-0.5 size-5 text-sky-700 dark:text-sky-300"
        />
        <div>
          <h2 className="font-semibold text-slate-950 dark:text-white">
            Restaurer depuis le cloud
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            Recherche les données déjà synchronisées pour ce compte et les
            restaure dans son espace local. Le cloud n’est jamais vidé ni
            remplacé par cette opération.
          </p>
        </div>
      </div>

      {state.status === 'idle' ? (
        <Button className="w-full" variant="secondary" onClick={() => void analyze()}>
          <RefreshCw aria-hidden="true" className="size-4" />
          Rechercher mes données cloud
        </Button>
      ) : null}

      {state.status === 'loading' ? (
        <InlineNotice tone="info" title="Recherche des données cloud">
          SportPilot vérifie les domaines synchronisés de ce compte.
        </InlineNotice>
      ) : null}

      {state.status === 'error' ? (
        <InlineNotice tone="error" title="Analyse cloud interrompue">
          {state.message}
          <Button
            className="mt-3 w-full"
            variant="secondary"
            onClick={() => void analyze()}
          >
            Relancer l’analyse
          </Button>
        </InlineNotice>
      ) : null}

      {preview && !preview.hasCloudData ? (
        <InlineNotice tone="info" title="Aucune donnée cloud trouvée">
          Aucun domaine synchronisé ne contient actuellement de données pour ce
          compte. Commencer avec un espace vide ne modifiera pas le cloud.
        </InlineNotice>
      ) : null}

      {preview?.hasCloudData ? (
        <>
          <InlineNotice tone="success" title="Des données ont été trouvées pour ce compte">
            {preview.cloudRecordCount} donnée
            {preview.cloudRecordCount > 1 ? 's' : ''} restaurable
            {preview.cloudDeletionMarkerCount > 0
              ? ` et ${preview.cloudDeletionMarkerCount} marqueur${
                  preview.cloudDeletionMarkerCount > 1 ? 's' : ''
                } de suppression`
              : ''}.
          </InlineNotice>

          <div className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {preview.categories.map((category) => (
              <div
                key={category.key}
                className="flex items-center justify-between gap-4 px-4 py-3"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-950 dark:text-white">
                    {category.label}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {category.description}
                  </p>
                </div>
                <span className="shrink-0 font-bold text-sky-700 dark:text-sky-300">
                  {category.recordCount}
                </span>
              </div>
            ))}
          </div>

          {!preview.canRestore ? (
            <InlineNotice tone="info" title="Espace local déjà utilisé">
              Cet espace contient {preview.localMeaningfulRecordCount} donnée
              {preview.localMeaningfulRecordCount > 1 ? 's' : ''} locale
              {preview.localMeaningfulRecordCount > 1 ? 's' : ''}. Utilise les
              synchronisations par rubrique pour fusionner les données sans les
              remplacer.
            </InlineNotice>
          ) : (
            <>
              <div className="flex items-start gap-2 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                La restauration est préparée dans une base temporaire puis
                appliquée atomiquement. En cas d’erreur, l’espace local reste
                inchangé.
              </div>
              <Button
                className="w-full"
                disabled={state.status === 'restoring'}
                onClick={() => setConfirmationOpen(true)}
              >
                <CloudDownload aria-hidden="true" className="size-4" />
                Restaurer depuis le cloud
              </Button>
            </>
          )}
        </>
      ) : null}

      {state.status === 'success' ? (
        <InlineNotice tone="success" title="Restauration terminée">
          {state.result.restoredRecords} enregistrement
          {state.result.restoredRecords > 1 ? 's' : ''} restauré
          {state.result.restoredRecords > 1 ? 's' : ''}. Les données cloud sont
          restées intactes.
        </InlineNotice>
      ) : null}

      <ConfirmationDialog
        open={confirmationOpen}
        title="Restaurer les données cloud ?"
        description="Les domaines synchronisés de l’espace local vide seront remplacés par les données de ce compte. Les données cloud et l’espace invité resteront inchangés."
        confirmLabel="Restaurer depuis le cloud"
        isPending={state.status === 'restoring'}
        onCancel={() => setConfirmationOpen(false)}
        onConfirm={() => {
          setConfirmationOpen(false);
          if (prepared) void restore(prepared);
        }}
      />
    </section>
  );
}
