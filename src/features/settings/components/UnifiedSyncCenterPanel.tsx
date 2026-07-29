import {
  CloudCog,
  Clock3,
  RefreshCw,
  ShieldAlert,
  UserRound,
  WifiOff,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import {
  cloudAccountStatusLabel,
  resolveCloudAccountAccess,
} from '@/application/account/cloudAccountAccess';
import {
  readSyncOperationHistory,
  resolveLastSuccessfulSyncAt,
  summarizeSyncOperationHistory,
  SYNC_OPERATION_HISTORY_CHANGED_EVENT,
  type SyncOperationHistoryEntry,
} from '@/application/sync/syncOperationHistory';
import { createSyncOrchestrator } from '@/application/sync/syncOrchestrator';
import type { SyncPrototypeClient } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { createSyncPrototypeAccountFingerprint } from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { cn } from '@/shared/utils/cn';
import { UnifiedSyncCenterAdvancedDetails } from './UnifiedSyncCenterAdvancedDetails';
import { createDomains, createOrchestratorDomains } from './unifiedSyncDomainRegistry';
import {
  formatTimestamp,
  getEmptyOrchestratorSnapshot,
  getEmptySnapshot,
  historyStorageKey,
  readHistory,
  resolveClient,
  scrollToDetail,
  subscribeToNothing,
  writeHistory,
  type ConfirmationState,
  type DomainFailure,
  type SyncHistory,
  type UnifiedDomainId,
  type UnifiedOperation,
  type UnifiedSyncDetailId,
} from './unifiedSyncCenterModel';

export type { UnifiedSyncDetailId } from './unifiedSyncCenterModel';

interface Props {
  readonly client?: SyncPrototypeClient | null;
  readonly activeDetailId?: UnifiedSyncDetailId | undefined;
  readonly onOpenDetail?: (detailId: UnifiedSyncDetailId) => void;
  readonly initializeClient?: boolean;
}

export function UnifiedSyncCenterPanel({
  client: clientOverride,
  activeDetailId,
  onOpenDetail,
  initializeClient = true,
}: Props) {
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
  const domains = useMemo(() => createDomains(client, snapshot), [client, snapshot]);
  const enabledDomains = useMemo(
    () => domains.filter((domain) => domain.enabled),
    [domains],
  );
  const accountKey = useMemo(
    () => createSyncPrototypeAccountFingerprint(
      snapshot.account.userId ?? snapshot.account.email,
    ),
    [snapshot.account.email, snapshot.account.userId],
  );
  const orchestrator = useMemo(
    () => client && accountKey
      ? createSyncOrchestrator({
          accountKey,
          domains: createOrchestratorDomains(client),
          isOnline: () => navigator.onLine !== false,
          preflight: async () => {
            await client.ensureValidCloudCredentials?.();
          },
        })
      : null,
    [accountKey, client],
  );
  const orchestratorSnapshot = useSyncExternalStore(
    orchestrator?.subscribe ?? subscribeToNothing,
    orchestrator?.getSnapshot ?? getEmptyOrchestratorSnapshot,
    orchestrator?.getSnapshot ?? getEmptyOrchestratorSnapshot,
  );
  const busy = orchestratorSnapshot.isRunning && orchestratorSnapshot.currentOperation
    ? {
        operation: orchestratorSnapshot.currentOperation,
        ...(orchestratorSnapshot.currentDomainId
          ? { currentDomainId: orchestratorSnapshot.currentDomainId }
          : {}),
      }
    : undefined;
  const [isInitializing, setIsInitializing] = useState(Boolean(client && initializeClient));
  const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
  const cloudAccess = client?.getCloudAccessState?.() ?? resolveCloudAccountAccess(
    {
      ...snapshot.account,
      hasAccessToken:
        snapshot.account.hasAccessToken ?? snapshot.account.isLoggedIn,
    },
    { isOnline },
  );
  const accountReady =
    cloudAccess.isOperational || cloudAccess.canAttemptRenewal;
  const wasAccountReadyRef = useRef(accountReady);
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(Boolean(activeDetailId));
  const [failures, setFailures] = useState<Partial<Record<UnifiedDomainId, DomainFailure>>>({});
  const [lastOperation, setLastOperation] = useState<UnifiedOperation>('analyze');
  const [confirmation, setConfirmation] = useState<ConfirmationState>();
  const [feedback, setFeedback] = useState<
    | { readonly tone: 'success' | 'error' | 'info'; readonly message: string }
    | undefined
  >();
  const storageKey = useMemo(() => historyStorageKey(snapshot), [snapshot]);
  const [history, setHistory] = useState<SyncHistory>(() => readHistory(storageKey));
  const [operationHistory, setOperationHistory] = useState<readonly SyncOperationHistoryEntry[]>(
    () => readSyncOperationHistory(accountKey),
  );
  const operationSummary = useMemo(
    () => summarizeSyncOperationHistory(operationHistory),
    [operationHistory],
  );

  useEffect(() => () => orchestrator?.dispose(), [orchestrator]);

  useEffect(() => {
    setHistory(readHistory(storageKey));
  }, [storageKey]);

  useEffect(() => {
    if (activeDetailId) setIsAdvancedOpen(true);
  }, [activeDetailId]);

  useEffect(() => {
    const refresh = () => setOperationHistory(readSyncOperationHistory(accountKey));
    refresh();
    window.addEventListener(SYNC_OPERATION_HISTORY_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(SYNC_OPERATION_HISTORY_CHANGED_EVENT, refresh);
  }, [accountKey]);

  useEffect(() => {
    const updateOnlineState = () => setIsOnline(navigator.onLine !== false);
    window.addEventListener('online', updateOnlineState);
    window.addEventListener('offline', updateOnlineState);
    return () => {
      window.removeEventListener('online', updateOnlineState);
      window.removeEventListener('offline', updateOnlineState);
    };
  }, []);

  useEffect(() => {
    if (!client || !initializeClient) {
      setIsInitializing(false);
      return;
    }
    let mounted = true;
    void client.initialize()
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
  }, [client, initializeClient]);

  const persistHistory = useCallback((nextHistory: SyncHistory) => {
    setHistory(nextHistory);
    writeHistory(storageKey, nextHistory);
  }, [storageKey]);

  const runDomains = useCallback(async (
    operation: UnifiedOperation,
    targetIds?: readonly UnifiedDomainId[],
  ) => {
    if (!orchestrator || orchestratorSnapshot.isRunning) return;
    if (!isOnline) {
      setFeedback({
        tone: 'error',
        message: 'Aucune opération cloud n’est lancée hors connexion. Réessaie après le retour du réseau.',
      });
      return;
    }

    const selected = enabledDomains.filter(
      (domain) => !targetIds || targetIds.includes(domain.id),
    );
    if (selected.length === 0) return;

    setFeedback(undefined);
    setLastOperation(operation);
    setFailures((current) => {
      const next = { ...current };
      for (const domain of selected) delete next[domain.id];
      return next;
    });

    const result = await orchestrator.run({
      operation,
      source: 'manual',
      domainIds: selected.map((domain) => domain.id),
    });
    const nextFailures: Partial<Record<UnifiedDomainId, DomainFailure>> = {};
    for (const domainResult of result.domainResults) {
      if (!domainResult.errorMessage) continue;
      nextFailures[domainResult.domainId] = {
        operation,
        message: domainResult.errorMessage,
        ...(domainResult.status === 'not-run' ? { notExecuted: true } : {}),
      };
    }
    setFailures((current) => ({ ...current, ...nextFailures }));

    const timestamp = result.completedAt;
    if (operation === 'analyze') {
      persistHistory({ ...history, lastAnalysisAt: timestamp });
    } else {
      persistHistory({
        ...history,
        lastAnalysisAt: timestamp,
        lastSyncAt: timestamp,
      });
    }

    const completed = result.completedDomainIds.length;
    const failedCount = result.failedDomainIds.length;
    const notRunCount = result.domainResults.filter(
      (domain) => domain.status === 'not-run',
    ).length;
    if (notRunCount === result.domainResults.length && notRunCount > 0) {
      setFeedback({
        tone: 'info',
        message: result.domainResults[0]?.errorMessage
          ?? 'La synchronisation n’a pas été exécutée.',
      });
    } else if (failedCount === 0) {
      setFeedback({
        tone: 'success',
        message:
          operation === 'analyze'
            ? `${completed} ${completed > 1 ? 'rubriques analysées' : 'rubrique analysée'} sans erreur.`
            : `${completed} ${completed > 1 ? 'rubriques synchronisées' : 'rubrique synchronisée'} sans erreur.`,
      });
    } else {
      setFeedback({
        tone: 'error',
        message: `${completed} ${completed > 1 ? 'rubriques terminées' : 'rubrique terminée'}, ${failedCount} ${failedCount > 1 ? 'rubriques en échec' : 'rubrique en échec'}. Les autres domaines n’ont pas été bloqués.`,
      });
    }
  }, [enabledDomains, history, isOnline, orchestrator, orchestratorSnapshot.isRunning, persistHistory]);

  useEffect(() => {
    const wasReady = wasAccountReadyRef.current;
    wasAccountReadyRef.current = accountReady;
    if (wasReady || !accountReady || !client) return;

    setFailures({});
    setFeedback(undefined);
    void runDomains('analyze');
  }, [accountReady, client, runDomains]);

  const retryFailures = () => {
    const failedIds = enabledDomains
      .filter((domain) => failures[domain.id]?.operation === lastOperation)
      .map((domain) => domain.id);
    if (failedIds.length === 0) return;
    if (lastOperation === 'sync') {
      setConfirmation({ target: 'failures' });
      return;
    }
    void runDomains('analyze', failedIds);
  };

  if (!client) {
    return (
      <div className="space-y-3">
        <InlineNotice
          tone={runtime.errorMessage ? 'error' : 'info'}
          title={runtime.errorMessage ? 'Centre de synchronisation indisponible' : 'Synchronisation non activée'}
        >
          {runtime.errorMessage ??
            'Le centre unifié sera disponible lorsque la synchronisation cloud sera activée dans ce déploiement.'}
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

  const activeFailures = enabledDomains.filter(
    (domain) => failures[domain.id] && !failures[domain.id]?.notExecuted,
  );
  const notExecutedDomains = enabledDomains.filter(
    (domain) => failures[domain.id]?.notExecuted,
  );
  const analyzedDomains = enabledDomains.filter(
    (domain) => domain.differingEntityCount !== undefined,
  );
  const upToDateCount = enabledDomains.filter(
    (domain) => domain.differingEntityCount === 0 && !failures[domain.id],
  ).length;
  const differingDomains = enabledDomains.filter(
    (domain) => (domain.differingEntityCount ?? 0) > 0 && !failures[domain.id],
  );
  const totalDifferences = differingDomains.reduce(
    (sum, domain) => sum + (domain.differingEntityCount ?? 0),
    0,
  );
  const actionDisabled =
    isInitializing ||
    Boolean(busy) ||
    !accountReady ||
    !isOnline ||
    !orchestrator ||
    enabledDomains.length === 0;

  const globalStatus = busy
    ? busy.operation === 'analyze' ? 'Analyse en cours' : 'Synchronisation en cours'
    : orchestratorSnapshot.queueLength > 0
      ? `${orchestratorSnapshot.queueLength} ${orchestratorSnapshot.queueLength > 1 ? 'opérations en attente' : 'opération en attente'}`
    : !isOnline
      ? 'Hors connexion'
      : notExecutedDomains.length > 0
        ? 'Synchronisation non exécutée'
      : !accountReady
        ? cloudAccountStatusLabel(cloudAccess)
        : activeFailures.length > 0
          ? `${activeFailures.length} ${activeFailures.length > 1 ? 'échecs' : 'échec'}`
          : differingDomains.length > 0
            ? `${totalDifferences} ${totalDifferences > 1 ? 'différences' : 'différence'}`
            : analyzedDomains.length === enabledDomains.length && enabledDomains.length > 0
              ? 'Tout est à jour'
              : snapshot.sync.phase === 'in-sync'
                ? 'Synchronisation active'
                : 'Prêt à synchroniser';

  const accountDisplayLabel =
    snapshot.account.email ?? snapshot.account.displayName ?? 'Compte connecté';
  const lastSuccessfulSyncAt = resolveLastSuccessfulSyncAt(
    operationSummary.lastSuccessfulSync?.completedAt,
    history.lastSyncAt,
    snapshot.diagnostics.lastSyncCompletedAt,
  );

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-950/20 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CloudCog aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                Synchronisation du compte
              </h3>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Vérifie l’état général puis synchronise les données de ce compte. Les diagnostics et les rubriques détaillées restent disponibles dans les options avancées.
            </p>
          </div>
          <span className={cn(
            'inline-flex min-h-9 shrink-0 items-center rounded-full px-3 text-sm font-semibold',
            activeFailures.length > 0
              ? 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200'
              : differingDomains.length > 0
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200'
                : analyzedDomains.length === enabledDomains.length && enabledDomains.length > 0
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200'
                  : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200',
          )}>
            {globalStatus}
          </span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <UserRound aria-hidden="true" className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Compte actif</p>
            </div>
            <p className="mt-1 break-all text-sm font-bold text-slate-950 dark:text-white">
              {cloudAccess.isIdentityConnected
                ? accountDisplayLabel
                : 'Aucun compte connecté'}
            </p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock3 aria-hidden="true" className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Dernière synchronisation réussie</p>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">
              {formatTimestamp(lastSuccessfulSyncAt)}
            </p>
          </div>
        </div>

        {!accountReady && isOnline ? (
          <InlineNotice className="mt-4" tone="info" title="Accès cloud requis">
            {cloudAccess.message}
          </InlineNotice>
        ) : null}

        {!isOnline ? (
          <InlineNotice className="mt-4" tone="info" title="Mode hors connexion">
            <span className="inline-flex items-center gap-2">
              <WifiOff aria-hidden="true" className="size-4" />
              Les données locales restent utilisables. Les échanges reprendront après le retour du réseau.
            </span>
          </InlineNotice>
        ) : null}

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            onClick={() => setConfirmation({ target: 'all' })}
            disabled={actionDisabled}
          >
            <RefreshCw aria-hidden="true" className={cn('size-4', busy?.operation === 'sync' && 'animate-spin motion-reduce:animate-none')} />
            {busy?.operation === 'sync' ? 'Synchronisation en cours…' : 'Synchroniser maintenant'}
          </Button>
          <Link
            to={routePaths.accountDevices}
            className="inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-semibold text-brand-700 hover:bg-white/70 dark:text-brand-300 dark:hover:bg-slate-900"
          >
            Gérer le compte et les appareils
          </Link>
          {activeFailures.length > 0 ? (
            <Button
              variant="dangerGhost"
              onClick={retryFailures}
              disabled={actionDisabled}
            >
              <RefreshCw aria-hidden="true" className="size-4" />
              Relancer uniquement les rubriques en échec
            </Button>
          ) : null}
        </div>

        {busy?.currentDomainId ? (
          <p className="mt-3 text-sm font-medium text-brand-800 dark:text-brand-200" aria-live="polite">
            {busy.operation === 'analyze' ? 'Analyse' : 'Synchronisation'} : {domains.find((domain) => domain.id === busy.currentDomainId)?.label}
          </p>
        ) : null}

        {feedback ? (
          <InlineNotice
            className="mt-4"
            tone={feedback.tone === 'info' ? 'info' : feedback.tone}
            title={
              feedback.tone === 'error'
                ? 'Opération partiellement terminée'
                : feedback.tone === 'info'
                  ? 'Opération non exécutée'
                  : 'Opération terminée'
            }
          >
            {feedback.message}
          </InlineNotice>
        ) : null}
      </div>

      {differingDomains.length > 0 ? (
        <div className="rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/20 sm:p-5">
          <div className="flex items-start gap-3">
            <ShieldAlert aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-amber-700 dark:text-amber-300" />
            <div>
              <h4 className="font-semibold text-slate-950 dark:text-white">
                Des différences existent entre cet appareil et le cloud
              </h4>
              <p className="mt-1 text-sm leading-6 text-slate-700 dark:text-slate-300">
                Examine chaque rubrique avant de choisir. SportPilot ne remplace jamais silencieusement une version divergente.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => {
                  const first = differingDomains[0];
                  if (!first) return;
                  setIsAdvancedOpen(true);
                  if (onOpenDetail) onOpenDetail(first.detailId);
                  else window.setTimeout(() => scrollToDetail(first.detailId), 0);
                }}>
                  Examiner les différences
                </Button>
                <Button onClick={() => setConfirmation({ target: 'all' })} disabled={actionDisabled}>
                  Fusionner lorsque c’est possible
                </Button>
              </div>
              <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
                « Conserver cet appareil » et « Utiliser le cloud » ne sont proposés que dans les détails capables de garantir une résolution directionnelle. Le centre global privilégie la fusion non destructive.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      <UnifiedSyncCenterAdvancedDetails
        isOpen={isAdvancedOpen}
        onOpenChange={setIsAdvancedOpen}
        queueLength={orchestratorSnapshot.queueLength}
        upToDateCount={upToDateCount}
        enabledDomainCount={enabledDomains.length}
        totalDifferences={totalDifferences}
        lastAnalysisAt={history.lastAnalysisAt}
        isAnalyzing={busy?.operation === 'analyze'}
        actionDisabled={actionDisabled}
        onAnalyze={() => void runDomains('analyze')}
        operationHistory={operationHistory}
        lastSuccessfulSyncAt={operationSummary.lastSuccessfulSync?.completedAt}
        lastFailureAt={operationSummary.lastFailure?.completedAt}
        domains={domains}
        failures={failures}
        orchestratorDomains={orchestratorSnapshot.domains}
        activeDetailId={activeDetailId}
        onOpenDetail={onOpenDetail}
      />
      <ConfirmationDialog
        open={Boolean(confirmation)}
        title={confirmation?.target === 'failures' ? 'Relancer les synchronisations en échec ?' : 'Synchroniser toutes les rubriques ?'}
        description={confirmation?.target === 'failures'
          ? 'Seules les rubriques dont la dernière synchronisation a échoué seront relancées. Les autres ne seront pas modifiées.'
          : 'Chaque rubrique active sera traitée séparément. Une erreur n’empêchera pas les autres rubriques de continuer, et le détail restera visible.'}
        confirmLabel={confirmation?.target === 'failures' ? 'Relancer les échecs' : 'Synchroniser tout'}
        isPending={busy?.operation === 'sync'}
        onCancel={() => setConfirmation(undefined)}
        onConfirm={() => {
          const target = confirmation?.target;
          setConfirmation(undefined);
          if (target === 'failures') {
            const failedIds = enabledDomains
              .filter((domain) => failures[domain.id]?.operation === 'sync')
              .map((domain) => domain.id);
            void runDomains('sync', failedIds);
            return;
          }
          void runDomains('sync');
        }}
      />
    </div>
  );
}
