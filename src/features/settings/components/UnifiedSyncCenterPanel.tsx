import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  CloudCog,
  Clock3,
  RefreshCw,
  Search,
  WifiOff,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from 'react';
import { Link } from 'react-router-dom';

import { routePaths } from '@/app/routePaths';
import {
  createSyncOrchestrator,
  type SyncOrchestratorDomainAdapter,
  type SyncOrchestratorDomainId,
  type SyncOrchestratorSnapshot,
} from '@/application/sync/syncOrchestrator';
import {
  getSyncPrototypeClient,
  type SyncPrototypeClient,
  type SyncPrototypeSnapshot,
} from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { readSyncPrototypeConfigSafely } from '@/infrastructure/sync-prototype/syncPrototypeConfig';
import {
  createEmptySyncPrototypeDiagnostics,
  createSyncPrototypeAccountFingerprint,
} from '@/infrastructure/sync-prototype/syncPrototypeDiagnostics';
import { Button } from '@/shared/ui/Button';
import { ConfirmationDialog } from '@/shared/ui/ConfirmationDialog';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { cn } from '@/shared/utils/cn';

export type UnifiedSyncDetailId =
  | 'sync-detail-account-preferences'
  | 'sync-detail-rewards-routines'
  | 'sync-detail-weights'
  | 'sync-detail-activities'
  | 'sync-detail-goals'
  | 'sync-detail-strength'
  | 'sync-detail-nutrition-journal'
  | 'sync-detail-nutrition-library'
  | 'sync-detail-nutrition-tracking';

interface Props {
  readonly client?: SyncPrototypeClient | null;
  readonly activeDetailId?: UnifiedSyncDetailId | undefined;
  readonly onOpenDetail?: (detailId: UnifiedSyncDetailId) => void;
}

type UnifiedDomainId = SyncOrchestratorDomainId;

type UnifiedOperation = 'analyze' | 'sync';

type DomainStatus =
  | 'not-analyzed'
  | 'queued'
  | 'analyzing'
  | 'syncing'
  | 'up-to-date'
  | 'differences'
  | 'error';

interface DomainFailure {
  readonly operation: UnifiedOperation;
  readonly message: string;
}

interface SyncHistory {
  readonly lastAnalysisAt?: string;
  readonly lastSyncAt?: string;
}

interface DomainDescriptor {
  readonly id: UnifiedDomainId;
  readonly label: string;
  readonly description: string;
  readonly detailId: UnifiedSyncDetailId;
  readonly enabled: boolean;
  readonly snapshotStatus: string | undefined;
  readonly differingEntityCount: number | undefined;
  readonly snapshotErrorMessage: string | undefined;
  readonly analyze?: () => Promise<{ readonly differingEntityCount: number }>;
  readonly synchronize?: () => Promise<unknown>;
}

interface ConfirmationState {
  readonly target: 'all' | 'failures';
}

const EMPTY_SNAPSHOT: SyncPrototypeSnapshot = {
  account: { isLoggedIn: false, isLoading: false },
  sync: { status: 'not-started', phase: 'initial' },
  weights: { weights: [], deletedCount: 0, isLoading: false },
  diagnostics: createEmptySyncPrototypeDiagnostics(),
};

const EMPTY_ORCHESTRATOR_SNAPSHOT: SyncOrchestratorSnapshot = {
  accountKey: 'unavailable',
  isRunning: false,
  queueLength: 0,
  domains: {
    'account-preferences': { status: 'idle' },
    'rewards-routines': { status: 'idle' },
    weights: { status: 'idle' },
    activities: { status: 'idle' },
    goals: { status: 'idle' },
    strength: { status: 'idle' },
    'nutrition-journal': { status: 'idle' },
    'nutrition-library': { status: 'idle' },
    'nutrition-tracking': { status: 'idle' },
  },
};

const subscribeToNothing = (): (() => void) => () => undefined;
const getEmptySnapshot = (): SyncPrototypeSnapshot => EMPTY_SNAPSHOT;
const getEmptyOrchestratorSnapshot = (): SyncOrchestratorSnapshot =>
  EMPTY_ORCHESTRATOR_SNAPSHOT;

function resolveClient(): {
  readonly client: SyncPrototypeClient | null;
  readonly errorMessage?: string;
} {
  const { config, errorMessage } = readSyncPrototypeConfigSafely();
  if (errorMessage) return { client: null, errorMessage };
  if (!config.enabled) return { client: null };

  try {
    return { client: getSyncPrototypeClient() };
  } catch (error) {
    return {
      client: null,
      errorMessage:
        error instanceof Error
          ? error.message
          : 'Le centre de synchronisation ne peut pas être initialisé.',
    };
  }
}

function formatTimestamp(value: string | undefined): string {
  if (!value) return 'Jamais';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return 'Jamais';
  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(parsed);
}

function historyStorageKey(snapshot: SyncPrototypeSnapshot): string | undefined {
  const fingerprint = createSyncPrototypeAccountFingerprint(
    snapshot.account.userId ?? snapshot.account.email,
  );
  return fingerprint
    ? `sportpilot:sync-center:history:${fingerprint.toLowerCase()}`
    : undefined;
}

function readHistory(storageKey: string | undefined): SyncHistory {
  if (!storageKey) return {};
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as SyncHistory;
    return {
      ...(typeof parsed.lastAnalysisAt === 'string'
        ? { lastAnalysisAt: parsed.lastAnalysisAt }
        : {}),
      ...(typeof parsed.lastSyncAt === 'string'
        ? { lastSyncAt: parsed.lastSyncAt }
        : {}),
    };
  } catch {
    return {};
  }
}

function writeHistory(storageKey: string | undefined, history: SyncHistory): void {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(history));
  } catch {
    // Les métadonnées du centre restent facultatives si le stockage est indisponible.
  }
}

function scrollToDetail(detailId: UnifiedSyncDetailId): void {
  document.getElementById(detailId)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
}

function snapshotPreview(
  snapshot: SyncPrototypeSnapshot,
  id: UnifiedDomainId,
): { readonly differingEntityCount: number } | undefined {
  switch (id) {
    case 'account-preferences':
      return snapshot.realAccountPreferences?.preview;
    case 'rewards-routines':
      return snapshot.realRewardsRoutines?.preview;
    case 'weights':
      return snapshot.realWeights?.preview;
    case 'activities':
      return snapshot.realActivities?.preview;
    case 'goals':
      return snapshot.realGoals?.preview;
    case 'strength':
      return snapshot.realStrength?.preview;
    case 'nutrition-journal':
      return snapshot.realNutritionJournal?.preview;
    case 'nutrition-library':
      return snapshot.realNutritionLibrary?.preview;
    case 'nutrition-tracking':
      return snapshot.realNutritionTracking?.preview;
  }
}

function createOrchestratorDomains(
  client: SyncPrototypeClient,
): readonly SyncOrchestratorDomainAdapter[] {
  const adapters: SyncOrchestratorDomainAdapter[] = [];
  const add = (
    id: UnifiedDomainId,
    analyze: (() => Promise<{ readonly differingEntityCount: number }>) | undefined,
    synchronize: (() => Promise<unknown>) | undefined,
  ) => {
    if (!analyze || !synchronize) return;
    adapters.push({
      id,
      analyze,
      synchronize,
      readPreview: () => snapshotPreview(client.getSnapshot(), id),
    });
  };

  add(
    'account-preferences',
    client.analyzeRealAccountPreferences
      ? () => client.analyzeRealAccountPreferences!()
      : undefined,
    client.syncRealAccountPreferences
      ? () => client.syncRealAccountPreferences!()
      : undefined,
  );
  add(
    'rewards-routines',
    client.analyzeRealRewardsRoutines
      ? () => client.analyzeRealRewardsRoutines!()
      : undefined,
    client.syncRealRewardsRoutines
      ? () => client.syncRealRewardsRoutines!()
      : undefined,
  );
  add('weights', () => client.analyzeRealWeights(), () => client.syncRealWeights());
  add(
    'activities',
    client.analyzeRealActivities ? () => client.analyzeRealActivities!() : undefined,
    client.syncRealActivities ? () => client.syncRealActivities!() : undefined,
  );
  add(
    'goals',
    client.analyzeRealGoals ? () => client.analyzeRealGoals!() : undefined,
    client.syncRealGoals ? () => client.syncRealGoals!() : undefined,
  );
  add(
    'strength',
    client.analyzeRealStrength ? () => client.analyzeRealStrength!() : undefined,
    client.syncRealStrength ? () => client.syncRealStrength!() : undefined,
  );
  add(
    'nutrition-journal',
    client.analyzeRealNutritionJournal
      ? () => client.analyzeRealNutritionJournal!()
      : undefined,
    client.syncRealNutritionJournal
      ? () => client.syncRealNutritionJournal!()
      : undefined,
  );
  add(
    'nutrition-library',
    client.analyzeRealNutritionLibrary
      ? () => client.analyzeRealNutritionLibrary!()
      : undefined,
    client.syncRealNutritionLibrary
      ? () => client.syncRealNutritionLibrary!()
      : undefined,
  );
  add(
    'nutrition-tracking',
    client.analyzeRealNutritionTracking
      ? () => client.analyzeRealNutritionTracking!()
      : undefined,
    client.syncRealNutritionTracking
      ? () => client.syncRealNutritionTracking!()
      : undefined,
  );

  return adapters;
}

function createDomains(
  client: SyncPrototypeClient | null,
  snapshot: SyncPrototypeSnapshot,
): readonly DomainDescriptor[] {
  const descriptors: readonly Omit<
    DomainDescriptor,
    | 'enabled'
    | 'snapshotStatus'
    | 'differingEntityCount'
    | 'snapshotErrorMessage'
    | 'analyze'
    | 'synchronize'
  >[] = [
    {
      id: 'account-preferences',
      label: 'Profil et réglages',
      description: 'Profil, calculs, tableau de bord et modèles d’endurance.',
      detailId: 'sync-detail-account-preferences',
    },
    {
      id: 'rewards-routines',
      label: 'Récompenses et routines',
      description: 'Badges, thèmes SportPilot, missions et rappels.',
      detailId: 'sync-detail-rewards-routines',
    },
    {
      id: 'weights',
      label: 'Pesées',
      description: 'Historique du poids et suppressions associées.',
      detailId: 'sync-detail-weights',
    },
    {
      id: 'activities',
      label: 'Activités',
      description: 'Course, marche, vélo, natation et cardio.',
      detailId: 'sync-detail-activities',
    },
    {
      id: 'goals',
      label: 'Objectifs',
      description: 'Objectifs sportifs et nutritionnels suivis.',
      detailId: 'sync-detail-goals',
    },
    {
      id: 'strength',
      label: 'Musculation',
      description: 'Exercices, modèles, séances et historique.',
      detailId: 'sync-detail-strength',
    },
    {
      id: 'nutrition-journal',
      label: 'Journal nutritionnel',
      description: 'Journées, repas, aliments et objectifs quotidiens recalculés, notamment après une pesée.',
      detailId: 'sync-detail-nutrition-journal',
    },
    {
      id: 'nutrition-library',
      label: 'Bibliothèque nutritionnelle',
      description: 'Produits, recettes et repas favoris.',
      detailId: 'sync-detail-nutrition-library',
    },
    {
      id: 'nutrition-tracking',
      label: 'Suivi nutritionnel',
      description: 'Bilans et états de suivi nutritionnel.',
      detailId: 'sync-detail-nutrition-tracking',
    },
  ];

  return descriptors.map((descriptor): DomainDescriptor => {
    const preview = snapshotPreview(snapshot, descriptor.id);

    switch (descriptor.id) {
      case 'account-preferences': {
        const state = snapshot.realAccountPreferences;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealAccountPreferences && client.syncRealAccountPreferences),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealAccountPreferences
            ? { analyze: () => client.analyzeRealAccountPreferences!() }
            : {}),
          ...(client?.syncRealAccountPreferences
            ? { synchronize: () => client.syncRealAccountPreferences!() }
            : {}),
        };
      }
      case 'rewards-routines': {
        const state = snapshot.realRewardsRoutines;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealRewardsRoutines && client.syncRealRewardsRoutines),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealRewardsRoutines
            ? { analyze: () => client.analyzeRealRewardsRoutines!() }
            : {}),
          ...(client?.syncRealRewardsRoutines
            ? { synchronize: () => client.syncRealRewardsRoutines!() }
            : {}),
        };
      }
      case 'weights': {
        const state = snapshot.realWeights;
        return {
          ...descriptor,
          enabled: Boolean(state && client),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client ? { analyze: () => client.analyzeRealWeights() } : {}),
          ...(client ? { synchronize: () => client.syncRealWeights() } : {}),
        };
      }
      case 'activities': {
        const state = snapshot.realActivities;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealActivities && client.syncRealActivities),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealActivities
            ? { analyze: () => client.analyzeRealActivities!() }
            : {}),
          ...(client?.syncRealActivities
            ? { synchronize: () => client.syncRealActivities!() }
            : {}),
        };
      }
      case 'goals': {
        const state = snapshot.realGoals;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealGoals && client.syncRealGoals),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealGoals
            ? { analyze: () => client.analyzeRealGoals!() }
            : {}),
          ...(client?.syncRealGoals
            ? { synchronize: () => client.syncRealGoals!() }
            : {}),
        };
      }
      case 'strength': {
        const state = snapshot.realStrength;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealStrength && client.syncRealStrength),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealStrength
            ? { analyze: () => client.analyzeRealStrength!() }
            : {}),
          ...(client?.syncRealStrength
            ? { synchronize: () => client.syncRealStrength!() }
            : {}),
        };
      }
      case 'nutrition-journal': {
        const state = snapshot.realNutritionJournal;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealNutritionJournal && client.syncRealNutritionJournal),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealNutritionJournal
            ? { analyze: () => client.analyzeRealNutritionJournal!() }
            : {}),
          ...(client?.syncRealNutritionJournal
            ? { synchronize: () => client.syncRealNutritionJournal!() }
            : {}),
        };
      }
      case 'nutrition-library': {
        const state = snapshot.realNutritionLibrary;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealNutritionLibrary && client.syncRealNutritionLibrary),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealNutritionLibrary
            ? { analyze: () => client.analyzeRealNutritionLibrary!() }
            : {}),
          ...(client?.syncRealNutritionLibrary
            ? { synchronize: () => client.syncRealNutritionLibrary!() }
            : {}),
        };
      }
      case 'nutrition-tracking': {
        const state = snapshot.realNutritionTracking;
        return {
          ...descriptor,
          enabled: Boolean(state && client?.analyzeRealNutritionTracking && client.syncRealNutritionTracking),
          snapshotStatus: state?.status,
          differingEntityCount: preview?.differingEntityCount,
          snapshotErrorMessage: state?.errorMessage,
          ...(client?.analyzeRealNutritionTracking
            ? { analyze: () => client.analyzeRealNutritionTracking!() }
            : {}),
          ...(client?.syncRealNutritionTracking
            ? { synchronize: () => client.syncRealNutritionTracking!() }
            : {}),
        };
      }
    }
  });
}

function domainStatus(
  domain: DomainDescriptor,
  failure: DomainFailure | undefined,
  orchestratorStatus: SyncOrchestratorSnapshot['domains'][UnifiedDomainId]['status'],
): DomainStatus {
  if (failure || domain.snapshotStatus === 'error' || orchestratorStatus === 'temporary-failure') return 'error';
  if (orchestratorStatus === 'queued') return 'queued';
  if (domain.snapshotStatus === 'analyzing' || orchestratorStatus === 'analyzing') return 'analyzing';
  if (domain.snapshotStatus === 'syncing' || orchestratorStatus === 'syncing') return 'syncing';
  if (domain.differingEntityCount === undefined) return 'not-analyzed';
  return domain.differingEntityCount === 0 ? 'up-to-date' : 'differences';
}

function statusLabel(status: DomainStatus, differences = 0): string {
  switch (status) {
    case 'not-analyzed':
      return 'À analyser';
    case 'queued':
      return 'En attente';
    case 'analyzing':
      return 'Analyse…';
    case 'syncing':
      return 'Synchronisation…';
    case 'up-to-date':
      return 'À jour';
    case 'differences':
      return `${differences} ${differences > 1 ? 'différences' : 'différence'}`;
    case 'error':
      return 'En échec';
  }
}

function statusClasses(status: DomainStatus): string {
  switch (status) {
    case 'up-to-date':
      return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-200';
    case 'differences':
      return 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-200';
    case 'error':
      return 'bg-red-100 text-red-800 dark:bg-red-950/50 dark:text-red-200';
    case 'queued':
      return 'bg-violet-100 text-violet-800 dark:bg-violet-950/50 dark:text-violet-200';
    case 'analyzing':
    case 'syncing':
      return 'bg-brand-100 text-brand-800 dark:bg-brand-950/50 dark:text-brand-200';
    case 'not-analyzed':
      return 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200';
  }
}

export function UnifiedSyncCenterPanel({
  client: clientOverride,
  activeDetailId,
  onOpenDetail,
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
  const [isInitializing, setIsInitializing] = useState(Boolean(client));
  const [isOnline, setIsOnline] = useState(() => navigator.onLine !== false);
  const [failures, setFailures] = useState<Partial<Record<UnifiedDomainId, DomainFailure>>>({});
  const [lastOperation, setLastOperation] = useState<UnifiedOperation>('analyze');
  const [confirmation, setConfirmation] = useState<ConfirmationState>();
  const [feedback, setFeedback] = useState<
    | { readonly tone: 'success' | 'error' | 'info'; readonly message: string }
    | undefined
  >();
  const storageKey = useMemo(() => historyStorageKey(snapshot), [snapshot]);
  const [history, setHistory] = useState<SyncHistory>(() => readHistory(storageKey));

  useEffect(() => () => orchestrator?.dispose(), [orchestrator]);

  useEffect(() => {
    setHistory(readHistory(storageKey));
  }, [storageKey]);

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
    if (failedCount === 0) {
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

  const activeFailures = enabledDomains.filter((domain) => failures[domain.id]);
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
  const accountReady = snapshot.account.isLoggedIn && !snapshot.account.isLoading;
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
      : !accountReady
        ? 'Compte non connecté'
        : activeFailures.length > 0
          ? `${activeFailures.length} ${activeFailures.length > 1 ? 'échecs' : 'échec'}`
          : differingDomains.length > 0
            ? `${totalDifferences} ${totalDifferences > 1 ? 'différences' : 'différence'}`
            : analyzedDomains.length === enabledDomains.length && enabledDomains.length > 0
              ? 'Tout est à jour'
              : 'Prêt à analyser';

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-brand-200 bg-brand-50/70 p-4 dark:border-brand-900 dark:bg-brand-950/20 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <CloudCog aria-hidden="true" className="size-6 text-brand-700 dark:text-brand-300" />
              <h3 className="text-lg font-semibold text-slate-950 dark:text-white">
                Centre de synchronisation
              </h3>
            </div>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">
              Analyse ou synchronise toutes les rubriques du compte, sans masquer les erreurs ni interrompre les domaines restants.
            </p>
            <p className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">
              Orchestrateur par compte · exécution séquentielle · file d’attente : {orchestratorSnapshot.queueLength}
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

        {!accountReady ? (
          <InlineNotice className="mt-4" tone="info" title="Connexion requise">
            Connecte le compte associé à cet espace avant d’analyser ou de synchroniser toutes les rubriques.
          </InlineNotice>
        ) : null}

        {!isOnline ? (
          <InlineNotice className="mt-4" tone="info" title="Mode hors connexion">
            <span className="inline-flex items-center gap-2">
              <WifiOff aria-hidden="true" className="size-4" />
              Les données locales restent utilisables. Les actions cloud reprendront après le retour du réseau.
            </span>
          </InlineNotice>
        ) : null}

        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rubriques à jour</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{upToDateCount}/{enabledDomains.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Différences</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{totalDifferences}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock3 aria-hidden="true" className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Dernière analyse</p>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{formatTimestamp(history.lastAnalysisAt)}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <div className="flex items-center gap-2 text-slate-500 dark:text-slate-400">
              <Clock3 aria-hidden="true" className="size-4" />
              <p className="text-xs font-semibold uppercase tracking-wide">Dernière synchronisation</p>
            </div>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{formatTimestamp(history.lastSyncAt)}</p>
          </div>
        </div>

        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
          <Button
            variant="secondary"
            onClick={() => void runDomains('analyze')}
            disabled={actionDisabled}
          >
            <Search aria-hidden="true" className="size-4" />
            {busy?.operation === 'analyze' ? 'Analyse en cours…' : 'Analyser tout'}
          </Button>
          <Button
            onClick={() => setConfirmation({ target: 'all' })}
            disabled={actionDisabled}
          >
            <RefreshCw aria-hidden="true" className={cn('size-4', busy?.operation === 'sync' && 'animate-spin')} />
            {busy?.operation === 'sync' ? 'Synchronisation en cours…' : 'Synchroniser tout'}
          </Button>
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
            title={feedback.tone === 'error' ? 'Opération partiellement terminée' : 'Opération terminée'}
          >
            {feedback.message}
          </InlineNotice>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
          <h4 className="font-semibold text-slate-950 dark:text-white">État par rubrique</h4>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
            Ouvre uniquement la rubrique dont tu as besoin avec le bouton Détail.
          </p>
        </div>
        <ul className="divide-y divide-slate-200 dark:divide-slate-800">
          {domains.map((domain) => {
            if (!domain.enabled) return null;
            const failure = failures[domain.id];
            const status = domainStatus(
              domain,
              failure,
              orchestratorSnapshot.domains[domain.id].status,
            );
            const errorMessage = failure?.message ?? domain.snapshotErrorMessage;
            return (
              <li key={domain.id} className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {status === 'up-to-date' ? (
                      <CheckCircle2 aria-hidden="true" className="size-5 shrink-0 text-emerald-600" />
                    ) : status === 'error' ? (
                      <AlertTriangle aria-hidden="true" className="size-5 shrink-0 text-red-600" />
                    ) : (
                      <CloudCog aria-hidden="true" className="size-5 shrink-0 text-brand-600" />
                    )}
                    <p className="font-semibold text-slate-950 dark:text-white">{domain.label}</p>
                  </div>
                  <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{domain.description}</p>
                  {domain.id === 'nutrition-journal' && status === 'differences' ? (
                    <p className="mt-1 text-sm font-medium text-amber-700 dark:text-amber-300">
                      Une pesée ou un réglage de calcul peut modifier l’objectif quotidien sans changer les aliments.
                    </p>
                  ) : null}
                  {errorMessage ? (
                    <p className="mt-1 text-sm font-medium text-red-700 dark:text-red-300">{errorMessage}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-2 sm:justify-end">
                  <span className={cn('inline-flex min-h-8 items-center rounded-full px-3 text-xs font-semibold', statusClasses(status))}>
                    {statusLabel(status, domain.differingEntityCount)}
                  </span>
                  <button
                    type="button"
                    aria-expanded={activeDetailId === domain.detailId}
                    onClick={() => {
                      if (onOpenDetail) {
                        onOpenDetail(domain.detailId);
                        return;
                      }
                      scrollToDetail(domain.detailId);
                    }}
                    className="inline-flex min-h-9 items-center gap-1 rounded-xl px-2 text-sm font-semibold text-brand-700 hover:bg-brand-50 dark:text-brand-300 dark:hover:bg-brand-950/30"
                  >
                    {activeDetailId === domain.detailId ? 'Masquer' : 'Détail'}
                    <ChevronRight
                      aria-hidden="true"
                      className={cn(
                        'size-4 transition-transform motion-reduce:transition-none',
                        activeDetailId === domain.detailId && 'rotate-90',
                      )}
                    />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>

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
