import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  CloudCog,
  History,
  Search,
} from 'lucide-react';

import {
  syncSourceLabel,
  type SyncOperationHistoryEntry,
} from '@/application/sync/syncOperationHistory';
import type { SyncOrchestratorSnapshot } from '@/application/sync/syncOrchestrator';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';
import {
  domainStatus,
  formatTimestamp,
  historyOperationLabel,
  historyOutcomeLabel,
  scrollToDetail,
  statusClasses,
  statusLabel,
  type DomainDescriptor,
  type DomainFailure,
  type UnifiedDomainId,
  type UnifiedSyncDetailId,
} from './unifiedSyncCenterModel';

interface Props {
  readonly isOpen: boolean;
  readonly onOpenChange: (isOpen: boolean) => void;
  readonly queueLength: number;
  readonly upToDateCount: number;
  readonly enabledDomainCount: number;
  readonly totalDifferences: number;
  readonly lastAnalysisAt: string | undefined;
  readonly isAnalyzing: boolean;
  readonly actionDisabled: boolean;
  readonly onAnalyze: () => void;
  readonly operationHistory: readonly SyncOperationHistoryEntry[];
  readonly lastSuccessfulSyncAt: string | undefined;
  readonly lastFailureAt: string | undefined;
  readonly domains: readonly DomainDescriptor[];
  readonly failures: Partial<Record<UnifiedDomainId, DomainFailure>>;
  readonly orchestratorDomains: SyncOrchestratorSnapshot['domains'];
  readonly activeDetailId: UnifiedSyncDetailId | undefined;
  readonly onOpenDetail: ((detailId: UnifiedSyncDetailId) => void) | undefined;
}

export function UnifiedSyncCenterAdvancedDetails({
  isOpen,
  onOpenChange,
  queueLength,
  upToDateCount,
  enabledDomainCount,
  totalDifferences,
  lastAnalysisAt,
  isAnalyzing,
  actionDisabled,
  onAnalyze,
  operationHistory,
  lastSuccessfulSyncAt,
  lastFailureAt,
  domains,
  failures,
  orchestratorDomains,
  activeDetailId,
  onOpenDetail,
}: Props) {
  return (
    <details
      className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950"
      open={isOpen}
      onToggle={(event) => onOpenChange(event.currentTarget.open)}
    >
      <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold text-slate-950 marker:hidden hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 dark:text-white dark:hover:bg-slate-900 sm:px-5">
        <CloudCog aria-hidden="true" className="size-5 text-brand-600" />
        <span className="min-w-0 flex-1">
          <span className="block">Détails techniques et historique</span>
          <span className="mt-0.5 block text-sm font-normal text-slate-600 dark:text-slate-300">
            Analyse, file d’attente, opérations récentes et état par rubrique.
          </span>
        </span>
        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 text-slate-500 transition-transform motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
        />
      </summary>

      <div className="space-y-4 border-t border-slate-200 p-4 dark:border-slate-800 sm:p-5">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
          Orchestrateur par compte · exécution séquentielle · file d’attente : {queueLength}
        </p>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Rubriques à jour</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{upToDateCount}/{enabledDomainCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Différences</p>
            <p className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">{totalDifferences}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dernière analyse</p>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{formatTimestamp(lastAnalysisAt)}</p>
          </div>
          <div className="rounded-xl border border-slate-200/80 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">File d’attente</p>
            <p className="mt-1 text-sm font-bold text-slate-950 dark:text-white">{queueLength}</p>
          </div>
        </div>

        <Button variant="secondary" onClick={onAnalyze} disabled={actionDisabled}>
          <Search aria-hidden="true" className="size-4" />
          {isAnalyzing ? 'Analyse en cours…' : 'Analyser tout'}
        </Button>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
          <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5">
            <div className="flex items-center gap-2">
              <History aria-hidden="true" className="size-5 text-brand-600" />
              <h4 className="font-semibold text-slate-950 dark:text-white">Historique récent</h4>
            </div>
            <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
              Opérations manuelles et automatiques enregistrées localement pour ce compte.
            </p>
          </div>
          {operationHistory.length === 0 ? (
            <p className="px-4 py-5 text-sm text-slate-600 dark:text-slate-300 sm:px-5">Aucune opération enregistrée.</p>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-slate-800">
              {operationHistory.slice(0, 6).map((entry) => (
                <li key={entry.id} className="flex flex-col gap-1 px-4 py-3 sm:px-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="font-semibold text-slate-950 dark:text-white">
                      {historyOperationLabel(entry)} · {historyOutcomeLabel(entry)}
                    </p>
                    <time className="text-xs font-medium text-slate-500 dark:text-slate-400">
                      {formatTimestamp(entry.completedAt)}
                    </time>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {syncSourceLabel(entry.source)} · {entry.completedDomainIds.length} rubrique(s) terminée(s)
                    {entry.failedDomainIds.length > 0 ? ` · ${entry.failedDomainIds.length} en échec` : ''}
                    {entry.differingEntityCount > 0 ? ` · ${entry.differingEntityCount} différence(s)` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <div className="grid gap-3 border-t border-slate-200 p-4 dark:border-slate-800 sm:grid-cols-2 sm:px-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dernière réussite</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                {lastSuccessfulSyncAt ? formatTimestamp(lastSuccessfulSyncAt) : 'Jamais'}
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Dernier échec</p>
              <p className="mt-1 text-sm font-semibold text-slate-950 dark:text-white">
                {lastFailureAt ? formatTimestamp(lastFailureAt) : 'Aucun'}
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
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
                orchestratorDomains[domain.id].status,
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
      </div>
    </details>
  );
}
