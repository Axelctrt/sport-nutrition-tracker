import {
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  Route,
  Timer,
  WifiOff,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  socialActivityDetailMatchesFeedCard,
  type SocialActivityCloudFeedCard,
} from '@/domain/friends/socialActivityCloudFeed';
import {
  SocialActivityDetailDialog,
  type SocialActivityDetailState,
} from '@/features/friends/components/SocialActivityDetailDialog';
import { SocialActivityFeedCard } from '@/features/friends/components/SocialActivityFeedCard';
import type { SocialActivitySnapshotCloudCredentials } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import {
  SocialActivityFeedCloudError,
  type SocialActivityFeedCloudGateway,
} from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';
import { Button } from '@/shared/ui/Button';
import { Card } from '@/shared/ui/Card';
import { InlineNotice } from '@/shared/ui/InlineNotice';

const defaultOnlineStatus = () => navigator.onLine !== false;

interface SocialActivityFeedPanelProps {
  readonly gateway: SocialActivityFeedCloudGateway;
  readonly getCredentials: () => SocialActivitySnapshotCloudCredentials | undefined;
  readonly isOnline?: () => boolean;
  readonly subscribeCredentials?: (listener: () => void) => () => void;
  readonly pageSize?: number;
}

type FeedStatus = 'loading' | 'ready' | 'empty' | 'authRequired' | 'offline' | 'error';

export function SocialActivityFeedPanel({
  gateway,
  getCredentials,
  isOnline = defaultOnlineStatus,
  subscribeCredentials,
  pageSize = 10,
}: SocialActivityFeedPanelProps) {
  const [status, setStatus] = useState<FeedStatus>('loading');
  const [items, setItems] = useState<readonly SocialActivityCloudFeedCard[]>([]);
  const itemsRef = useRef<readonly SocialActivityCloudFeedCard[]>([]);
  const [nextCursor, setNextCursor] = useState<string>();
  const nextCursorRef = useRef<string | undefined>(undefined);
  const [message, setMessage] = useState<string>();
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [detailState, setDetailState] = useState<SocialActivityDetailState>();
  const detailRequestSequenceRef = useRef(0);

  const loadPage = useCallback(async (mode: 'replace' | 'append') => {
    const credentials = getCredentials();
    if (!credentials) {
      setStatus('authRequired');
      setMessage('Connecte ton compte SportPilot pour voir les activités partagées par tes amis.');
      return;
    }
    if (!isOnline()) {
      setStatus(itemsRef.current.length > 0 ? 'ready' : 'offline');
      setMessage('Tu es hors ligne. Les activités déjà affichées restent consultables, mais le fil ne peut pas être actualisé.');
      return;
    }

    if (mode === 'replace') {
      setStatus('loading');
      setMessage(undefined);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const page = await gateway.listPage(credentials, {
        ...(mode === 'append' && nextCursorRef.current ? { cursor: nextCursorRef.current } : {}),
        limit: pageSize,
      });
      setItems((current) => {
        const merged = mode === 'replace' ? [...page.items] : [...current, ...page.items];
        const deduplicated = [...new Map(merged.map((item) => [item.snapshotId, item])).values()];
        itemsRef.current = deduplicated;
        return deduplicated;
      });
      nextCursorRef.current = page.nextCursor;
      setNextCursor(page.nextCursor);
      setStatus(page.items.length === 0 && mode === 'replace' ? 'empty' : 'ready');
      setMessage(undefined);
    } catch (error) {
      const cloudError = error instanceof SocialActivityFeedCloudError ? error : undefined;
      setStatus(itemsRef.current.length > 0 ? 'ready' : 'error');
      setMessage(cloudError?.message || 'Le fil d’activité n’a pas pu être chargé.');
    } finally {
      setIsLoadingMore(false);
    }
  }, [gateway, getCredentials, isOnline, pageSize]);

  useEffect(() => {
    void loadPage('replace');
  }, [loadPage]);

  useEffect(() => {
    const refreshWhenOnline = () => void loadPage('replace');
    window.addEventListener('online', refreshWhenOnline);
    return () => window.removeEventListener('online', refreshWhenOnline);
  }, [loadPage]);

  useEffect(() => {
    if (!subscribeCredentials) return undefined;
    return subscribeCredentials(() => void loadPage('replace'));
  }, [loadPage, subscribeCredentials]);

  const closeDetail = useCallback(() => {
    detailRequestSequenceRef.current += 1;
    setDetailState(undefined);
  }, []);

  const openDetail = async (card: SocialActivityCloudFeedCard) => {
    const requestSequence = detailRequestSequenceRef.current + 1;
    detailRequestSequenceRef.current = requestSequence;
    setDetailState({ card, status: 'loading' });
    const credentials = getCredentials();
    if (!credentials) {
      if (detailRequestSequenceRef.current !== requestSequence) return;
      setDetailState({
        card,
        status: 'error',
        message: 'Reconnecte ton compte SportPilot pour ouvrir cette activité.',
      });
      return;
    }
    if (!isOnline()) {
      if (detailRequestSequenceRef.current !== requestSequence) return;
      setDetailState({
        card,
        status: 'error',
        message: 'Une connexion est nécessaire pour revérifier les autorisations de cette activité.',
      });
      return;
    }
    try {
      const snapshot = await gateway.readDetail(credentials, card.snapshotId);
      if (detailRequestSequenceRef.current !== requestSequence) return;
      if (!socialActivityDetailMatchesFeedCard(card, snapshot)) {
        throw new Error('La réponse reçue ne correspond pas à l’activité sélectionnée.');
      }
      setDetailState({ card, status: 'ready', snapshot });
    } catch (error) {
      if (detailRequestSequenceRef.current !== requestSequence) return;
      setDetailState({
        card,
        status: 'error',
        message: error instanceof Error ? error.message : 'L’activité partagée n’a pas pu être chargée.',
      });
    }
  };

  const countLabel = useMemo(
    () => `${items.length} activité${items.length > 1 ? 's' : ''}`,
    [items.length],
  );

  return (
    <>
      <Card className="p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Partages cloud autorisés
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Fil d’activité amis
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600 dark:text-slate-300">
              Cartes récentes chargées depuis les snapshots filtrés. Le détail est revérifié par le serveur à chaque ouverture.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-200">
              {countLabel}
            </span>
            <Button
              aria-label="Actualiser le fil"
              className="size-11 px-0"
              disabled={status === 'loading'}
              size="sm"
              variant="secondary"
              onClick={() => void loadPage('replace')}
            >
              <RefreshCw aria-hidden="true" className={`size-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {status === 'loading' ? (
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300" role="status">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Chargement du fil d’activité…
          </p>
        ) : null}

        {status === 'authRequired' ? (
          <InlineNotice title="Compte requis"><p>{message}</p></InlineNotice>
        ) : null}

        {status === 'offline' ? (
          <InlineNotice title="Mode hors ligne"><p className="inline-flex items-center gap-2"><WifiOff aria-hidden="true" className="size-4" />{message}</p></InlineNotice>
        ) : null}

        {status === 'error' ? (
          <InlineNotice tone="error" title="Fil indisponible"><p>{message}</p></InlineNotice>
        ) : null}

        {status === 'empty' ? (
          <p className="mt-4 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-600 dark:border-slate-800 dark:text-slate-300">
            Aucune activité partagée par tes amis pour le moment.
          </p>
        ) : null}

        {message && status === 'ready' ? (
          <InlineNotice title="Actualisation différée"><p>{message}</p></InlineNotice>
        ) : null}

        {items.length > 0 ? (
          <div className="mt-5 space-y-3">
            {items.map((card) => (
              <SocialActivityFeedCard
                key={card.snapshotId}
                card={card}
                onOpenDetail={(selectedCard) => void openDetail(selectedCard)}
              />
            ))}
          </div>
        ) : null}

        {nextCursor ? (
          <Button
            className="mt-5 min-h-11 w-full"
            disabled={isLoadingMore}
            variant="secondary"
            onClick={() => void loadPage('append')}
          >
            {isLoadingMore
              ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              : <ChevronDown aria-hidden="true" className="size-4" />}
            {isLoadingMore ? 'Chargement…' : 'Afficher plus d’activités'}
          </Button>
        ) : null}

        <div className="mt-5 grid gap-2 text-xs font-semibold text-slate-500 sm:grid-cols-3 dark:text-slate-400">
          <p className="inline-flex items-center gap-2"><Route aria-hidden="true" className="size-4" />Pagination déterministe</p>
          <p className="inline-flex items-center gap-2"><Timer aria-hidden="true" className="size-4" />Détail chargé à la demande</p>
          <p className="inline-flex items-center gap-2"><WifiOff aria-hidden="true" className="size-4" />Aucune donnée brute lue</p>
        </div>
      </Card>

      {detailState ? (
        <SocialActivityDetailDialog
          detailState={detailState}
          onClose={closeDetail}
        />
      ) : null}
    </>
  );
}
