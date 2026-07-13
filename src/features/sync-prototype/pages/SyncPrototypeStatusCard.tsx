import { RefreshCw } from 'lucide-react';

import type { SyncPrototypeSyncSnapshot } from '@/infrastructure/sync-prototype/syncPrototypeClient';
import { SYNC_PROTOTYPE_DATABASE_NAME } from '@/infrastructure/sync-prototype/SyncPrototypeDatabase';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';
import {
  syncPhaseLabels,
  syncStatusLabels,
  type ActionStatus,
} from './syncPrototypePresentation';

interface Props {
  readonly sync: SyncPrototypeSyncSnapshot;
  readonly isLoggedIn: boolean;
  readonly isCloudActionBusy: boolean;
  readonly isInitializing: boolean;
  readonly actionStatus: ActionStatus;
  readonly onSync: () => void;
}

export function SyncPrototypeStatusCard({
  sync,
  isLoggedIn,
  isCloudActionBusy,
  isInitializing,
  actionStatus,
  onSync,
}: Props) {
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="rounded-xl bg-slate-100 p-2 text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          <RefreshCw aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-slate-950 dark:text-white">
            État de synchronisation
          </h2>
          <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
            État technique de la base expérimentale uniquement.
          </p>
        </div>
      </div>

      <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
        <div>
          <dt className="font-medium text-slate-500 dark:text-slate-400">Connexion</dt>
          <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
            {syncStatusLabels[sync.status]}
          </dd>
        </div>
        <div>
          <dt className="font-medium text-slate-500 dark:text-slate-400">Phase</dt>
          <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
            {syncPhaseLabels[sync.phase]}
          </dd>
        </div>
        {typeof sync.progress === 'number' ? (
          <div>
            <dt className="font-medium text-slate-500 dark:text-slate-400">Progression</dt>
            <dd className="mt-1 font-semibold text-slate-950 dark:text-white">
              {Math.round(sync.progress)} %
            </dd>
          </div>
        ) : null}
        <div>
          <dt className="font-medium text-slate-500 dark:text-slate-400">Base locale</dt>
          <dd className="mt-1 break-all font-mono text-xs text-slate-950 dark:text-white">
            {SYNC_PROTOTYPE_DATABASE_NAME}
          </dd>
        </div>
      </dl>

      {sync.errorMessage ? (
        <InlineNotice className="mt-4" tone="error" title="Erreur Dexie Cloud">
          {sync.errorMessage}
        </InlineNotice>
      ) : null}

      <Button
        className="mt-5 w-full sm:w-auto"
        disabled={!isLoggedIn || isCloudActionBusy || isInitializing}
        onClick={onSync}
        variant="secondary"
      >
        <RefreshCw
          aria-hidden="true"
          className={
            actionStatus === 'sync'
              ? 'size-4 animate-spin motion-reduce:animate-none'
              : 'size-4'
          }
        />
        {actionStatus === 'sync' ? 'Synchronisation…' : 'Synchroniser maintenant'}
      </Button>
    </Card>
  );
}
