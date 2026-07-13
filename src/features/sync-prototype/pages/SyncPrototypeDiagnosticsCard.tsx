import { ChevronDown, ClipboardCopy, Fingerprint } from 'lucide-react';

import type { SyncPrototypeSnapshot } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import { formatDiagnosticDate } from './syncPrototypePresentation';

interface Props {
  readonly diagnostics: SyncPrototypeSnapshot['diagnostics'];
  readonly isOpen: boolean;
  readonly onToggle: () => void;
  readonly onCopy: () => void;
}

export function SyncPrototypeDiagnosticsCard({
  diagnostics,
  isOpen,
  onToggle,
  onCopy,
}: Props) {
  return (
    <Card className="overflow-hidden p-0">
      <button
        aria-controls="sync-prototype-diagnostics-content"
        aria-expanded={isOpen}
        className="flex min-h-20 w-full items-center gap-3 p-5 text-left transition hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand-600 sm:p-6 dark:hover:bg-slate-800/60"
        onClick={onToggle}
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
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {isOpen ? (
        <div
          className="space-y-5 border-t border-slate-200 p-5 sm:p-6 dark:border-slate-800"
          id="sync-prototype-diagnostics-content"
        >
          <InlineNotice tone="info" title="Politique de conflit testée">
            Des propriétés différentes se fusionnent. Pour une même propriété, la dernière opération reçue gagne. Un marqueur de suppression masque toujours une ancienne pesée réintroduite par un appareil hors ligne.
          </InlineNotice>

          <dl className="grid gap-4 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Empreinte du compte</dt>
              <dd className="mt-1 break-all font-mono text-xs font-semibold text-slate-950 dark:text-white">
                {diagnostics.accountFingerprint ?? 'Non connecté'}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Base expérimentale</dt>
              <dd className="mt-1 break-all font-mono text-xs font-semibold text-slate-950 dark:text-white">
                {diagnostics.databaseName} v{diagnostics.databaseVersion}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Données visibles</dt>
              <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                {diagnostics.visibleWeightCount} pesée{diagnostics.visibleWeightCount > 1 ? 's' : ''} —{' '}
                {diagnostics.deletedWeightCount} suppression{diagnostics.deletedWeightCount > 1 ? 's' : ''}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Dernière synchronisation terminée</dt>
              <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                {formatDiagnosticDate(diagnostics.lastSyncCompletedAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Dernier rafraîchissement local</dt>
              <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                {formatDiagnosticDate(diagnostics.lastRefreshAt)}
              </dd>
            </div>
            <div>
              <dt className="font-medium text-slate-500 dark:text-slate-400">Dernière pesée modifiée</dt>
              <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
                {formatDiagnosticDate(diagnostics.latestWeightUpdatedAt)}
              </dd>
            </div>
          </dl>

          <Button className="w-full sm:w-auto" onClick={onCopy} variant="secondary">
            <ClipboardCopy aria-hidden="true" className="size-4" />
            Copier le diagnostic
          </Button>
        </div>
      ) : null}
    </Card>
  );
}
