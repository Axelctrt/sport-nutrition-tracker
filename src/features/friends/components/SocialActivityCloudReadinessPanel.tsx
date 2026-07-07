import {
  CheckCircle2,
  CloudCog,
  Database,
  LoaderCircle,
  RefreshCw,
  ShieldAlert,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';

import type { SocialActivityCloudReadiness } from '@/domain/friends/socialActivityCloudFeed';
import type { SocialActivitySnapshotCloudCredentials } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import {
  SocialActivityFeedCloudError,
  type SocialActivityFeedCloudGateway,
} from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

const defaultOnlineStatus = () => navigator.onLine !== false;

type PanelStatus =
  | 'loading'
  | 'ready'
  | 'migrationRequired'
  | 'prerequisiteMissing'
  | 'authRequired'
  | 'offline'
  | 'error';

interface SocialActivityCloudReadinessPanelProps {
  readonly gateway: SocialActivityFeedCloudGateway;
  readonly getCredentials: () => SocialActivitySnapshotCloudCredentials | undefined;
  readonly isOnline?: () => boolean;
  readonly subscribeCredentials?: (listener: () => void) => () => void;
}

function readinessTitle(status: PanelStatus): string {
  if (status === 'ready') return 'Cloud social prêt';
  if (status === 'migrationRequired') return 'Migration D1 requise';
  if (status === 'prerequisiteMissing') return 'Socle social incomplet';
  if (status === 'offline') return 'Vérification hors ligne';
  if (status === 'authRequired') return 'Connexion requise';
  if (status === 'error') return 'Vérification indisponible';
  return 'Vérification en cours';
}

export function SocialActivityCloudReadinessPanel({
  gateway,
  getCredentials,
  isOnline = defaultOnlineStatus,
  subscribeCredentials,
}: SocialActivityCloudReadinessPanelProps) {
  const [status, setStatus] = useState<PanelStatus>('loading');
  const [readiness, setReadiness] = useState<SocialActivityCloudReadiness>();
  const [message, setMessage] = useState<string>();

  const checkReadiness = useCallback(async () => {
    const credentials = getCredentials();
    if (!credentials) {
      setStatus('authRequired');
      setReadiness(undefined);
      setMessage('Connecte ton compte SportPilot pour vérifier l’activation du cloud social.');
      return;
    }
    if (!isOnline()) {
      setStatus('offline');
      setReadiness(undefined);
      setMessage('Une connexion réseau est nécessaire pour vérifier D1 et la session cloud.');
      return;
    }

    setStatus('loading');
    setMessage(undefined);
    try {
      const result = await gateway.readReadiness(credentials);
      setReadiness(result);
      setStatus(result.status);
      setMessage(undefined);
    } catch (error) {
      const cloudError = error instanceof SocialActivityFeedCloudError ? error : undefined;
      setReadiness(undefined);
      setStatus('error');
      setMessage(cloudError?.message || 'Le statut du cloud social n’a pas pu être vérifié.');
    }
  }, [gateway, getCredentials, isOnline]);

  useEffect(() => {
    void checkReadiness();
  }, [checkReadiness]);

  useEffect(() => {
    const refreshWhenOnline = () => void checkReadiness();
    window.addEventListener('online', refreshWhenOnline);
    return () => window.removeEventListener('online', refreshWhenOnline);
  }, [checkReadiness]);

  useEffect(() => {
    if (!subscribeCredentials) return undefined;
    return subscribeCredentials(() => void checkReadiness());
  }, [checkReadiness, subscribeCredentials]);

  const isReady = status === 'ready';

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <div className={`rounded-2xl p-3 ${isReady
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-200'
            : 'bg-brand-100 text-brand-700 dark:bg-brand-950 dark:text-brand-200'}`}
          >
            {status === 'loading'
              ? <LoaderCircle aria-hidden="true" className="size-5 animate-spin" />
              : (isReady
                  ? <CheckCircle2 aria-hidden="true" className="size-5" />
                  : <CloudCog aria-hidden="true" className="size-5" />)}
          </div>
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Activation contrôlée
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              {readinessTitle(status)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Vérifie la session Dexie Cloud, le binding D1 et le schéma nécessaire au fil d’activité réel.
            </p>
          </div>
        </div>
        <Button
          className="min-h-11 shrink-0"
          disabled={status === 'loading'}
          size="sm"
          variant="secondary"
          onClick={() => void checkReadiness()}
        >
          <RefreshCw aria-hidden="true" className={`size-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
          Vérifier
        </Button>
      </div>

      {status === 'loading' ? (
        <p className="mt-4 text-sm font-semibold text-slate-600 dark:text-slate-300" role="status">
          Contrôle du service social…
        </p>
      ) : null}

      {status === 'ready' && readiness ? (
        <InlineNotice tone="success" title="Activation validée">
          <p>La session cloud, D1 et le schéma des snapshots sont disponibles.</p>
        </InlineNotice>
      ) : null}

      {status === 'migrationRequired' && readiness ? (
        <InlineNotice title="Migration distante non appliquée">
          <p>
            Applique <code>{readiness.requiredMigration}</code> sur D1 avant les essais réels à deux comptes.
          </p>
        </InlineNotice>
      ) : null}

      {status === 'prerequisiteMissing' && readiness ? (
        <InlineNotice tone="error" title="Prérequis sociaux absents">
          <p>Le socle amis doit être initialisé avant le fil d’activité.</p>
        </InlineNotice>
      ) : null}

      {status === 'authRequired' || status === 'offline' || status === 'error' ? (
        <InlineNotice tone={status === 'error' ? 'error' : 'info'} title={readinessTitle(status)}>
          <p className="inline-flex items-center gap-2">
            {status === 'offline'
              ? <WifiOff aria-hidden="true" className="size-4" />
              : <ShieldAlert aria-hidden="true" className="size-4" />}
            {message}
          </p>
        </InlineNotice>
      ) : null}

      {readiness ? (
        <div className="mt-4 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3 dark:text-slate-400">
          <p className="inline-flex items-center gap-2"><CloudCog aria-hidden="true" className="size-4" />Contrat {readiness.contractVersion}</p>
          <p className="inline-flex items-center gap-2"><Database aria-hidden="true" className="size-4" />Binding D1 validé</p>
          <p className="inline-flex items-center gap-2"><CheckCircle2 aria-hidden="true" className="size-4" />Session authentifiée</p>
        </div>
      ) : null}
    </Card>
  );
}
