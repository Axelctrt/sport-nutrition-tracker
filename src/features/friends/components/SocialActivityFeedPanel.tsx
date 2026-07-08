import {
  ChevronDown,
  LoaderCircle,
  RefreshCw,
  ShieldCheck,
  WifiOff,
} from 'lucide-react';
import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  normalizeSocialActivityFeedCards,
  socialActivityDetailMatchesFeedCard,
  socialActivityFeedCardsHaveSameVisibleRevision,
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

interface FeedScrollAnchor {
  readonly snapshotId: string;
  readonly top: number;
}

function readVisibleFeedAnchor(container: HTMLElement | null): FeedScrollAnchor | undefined {
  if (!container) return undefined;
  const cards = [...container.querySelectorAll<HTMLElement>('[data-social-feed-card-id]')];
  const visible = cards.find((element) => element.getBoundingClientRect().bottom > 0) ?? cards[0];
  const snapshotId = visible?.dataset.socialFeedCardId;
  if (!visible || !snapshotId) return undefined;
  return { snapshotId, top: visible.getBoundingClientRect().top };
}

function formatRefreshTime(value: Date | undefined): string | undefined {
  if (!value) return undefined;
  return new Intl.DateTimeFormat('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(value);
}

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
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date>();
  const [detailState, setDetailState] = useState<SocialActivityDetailState>();
  const detailRequestSequenceRef = useRef(0);
  const feedRequestSequenceRef = useRef(0);
  const loadMoreInFlightRef = useRef(false);
  const activeRecipientRef = useRef<string | undefined>(undefined);
  const feedListRef = useRef<HTMLDivElement>(null);
  const pendingScrollAnchorRef = useRef<FeedScrollAnchor | undefined>(undefined);

  const clearFeed = useCallback(() => {
    itemsRef.current = [];
    nextCursorRef.current = undefined;
    setItems([]);
    setNextCursor(undefined);
    setMessage(undefined);
    setLastUpdatedAt(undefined);
    setIsRefreshing(false);
    setIsLoadingMore(false);
    loadMoreInFlightRef.current = false;
    detailRequestSequenceRef.current += 1;
    setDetailState(undefined);
  }, []);

  const loadPage = useCallback(async (mode: 'replace' | 'append') => {
    const credentials = getCredentials();
    if (!credentials) {
      feedRequestSequenceRef.current += 1;
      activeRecipientRef.current = undefined;
      clearFeed();
      setStatus('authRequired');
      setMessage('Connecte ton compte SportPilot pour voir les activités partagées par tes amis.');
      return;
    }

    if (activeRecipientRef.current !== credentials.userId) {
      feedRequestSequenceRef.current += 1;
      activeRecipientRef.current = credentials.userId;
      clearFeed();
    }

    if (!isOnline()) {
      setIsRefreshing(false);
      setIsLoadingMore(false);
      loadMoreInFlightRef.current = false;
      setStatus(itemsRef.current.length > 0 ? 'ready' : 'offline');
      setMessage('Tu es hors ligne. Les activités déjà affichées restent consultables, mais le fil ne peut pas être actualisé.');
      return;
    }

    if (mode === 'append') {
      if (!nextCursorRef.current || loadMoreInFlightRef.current) return;
      loadMoreInFlightRef.current = true;
      setIsLoadingMore(true);
    } else if (itemsRef.current.length > 0) {
      setIsRefreshing(true);
      setMessage(undefined);
    } else {
      setStatus('loading');
      setMessage(undefined);
    }

    const requestSequence = feedRequestSequenceRef.current + 1;
    feedRequestSequenceRef.current = requestSequence;
    const requestedRecipient = credentials.userId;
    const requestedCursor = mode === 'append' ? nextCursorRef.current : undefined;

    try {
      const page = await gateway.listPage(credentials, {
        ...(requestedCursor ? { cursor: requestedCursor } : {}),
        limit: pageSize,
      });
      if (
        feedRequestSequenceRef.current !== requestSequence
        || activeRecipientRef.current !== requestedRecipient
      ) return;

      const previousItems = itemsRef.current;
      const nextItems = normalizeSocialActivityFeedCards(
        mode === 'replace' ? page.items : [...previousItems, ...page.items],
      );

      if (mode === 'replace' && previousItems.length > 0) {
        pendingScrollAnchorRef.current = readVisibleFeedAnchor(feedListRef.current);
      }

      itemsRef.current = nextItems;
      setItems(nextItems);

      const stalledCursor = mode === 'append'
        && page.nextCursor === requestedCursor
        && nextItems.length === previousItems.length;
      const resolvedCursor = stalledCursor ? undefined : page.nextCursor;
      nextCursorRef.current = resolvedCursor;
      setNextCursor(resolvedCursor);
      setStatus(nextItems.length === 0 ? 'empty' : 'ready');
      setMessage(stalledCursor ? 'Toutes les activités disponibles sont affichées.' : undefined);
      setLastUpdatedAt(new Date());

      setDetailState((current) => {
        if (!current) return current;
        const currentCard = nextItems.find((item) => item.snapshotId === current.card.snapshotId);
        if (!currentCard || !socialActivityFeedCardsHaveSameVisibleRevision(current.card, currentCard)) {
          detailRequestSequenceRef.current += 1;
          return undefined;
        }
        return current.card === currentCard ? current : { ...current, card: currentCard };
      });
    } catch (error) {
      if (
        feedRequestSequenceRef.current !== requestSequence
        || activeRecipientRef.current !== requestedRecipient
      ) return;
      const cloudError = error instanceof SocialActivityFeedCloudError ? error : undefined;
      setStatus(itemsRef.current.length > 0 ? 'ready' : 'error');
      setMessage(cloudError?.message || 'Le fil d’activité n’a pas pu être chargé.');
    } finally {
      if (feedRequestSequenceRef.current === requestSequence) {
        setIsRefreshing(false);
        setIsLoadingMore(false);
        loadMoreInFlightRef.current = false;
      }
    }
  }, [clearFeed, gateway, getCredentials, isOnline, pageSize]);

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

  useLayoutEffect(() => {
    const anchor = pendingScrollAnchorRef.current;
    pendingScrollAnchorRef.current = undefined;
    if (!anchor || !feedListRef.current) return;
    const element = [...feedListRef.current.querySelectorAll<HTMLElement>('[data-social-feed-card-id]')]
      .find((candidate) => candidate.dataset.socialFeedCardId === anchor.snapshotId);
    if (!element) return;
    const offset = element.getBoundingClientRect().top - anchor.top;
    if (Math.abs(offset) > 1) window.scrollBy({ top: offset, behavior: 'auto' });
  }, [items]);

  const closeDetail = useCallback(() => {
    detailRequestSequenceRef.current += 1;
    setDetailState(undefined);
  }, []);

  const openDetail = async (card: SocialActivityCloudFeedCard) => {
    const requestSequence = detailRequestSequenceRef.current + 1;
    detailRequestSequenceRef.current = requestSequence;
    setDetailState({ card, status: 'loading' });
    const credentials = getCredentials();
    if (!credentials || credentials.userId !== card.recipientUserId) {
      if (detailRequestSequenceRef.current !== requestSequence) return;
      setDetailState({
        card,
        status: 'error',
        message: 'Reconnecte le bon compte SportPilot pour ouvrir cette activité.',
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
        throw new Error('Cette activité a changé. Actualise le fil pour ouvrir sa version la plus récente.');
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
  const refreshTime = formatRefreshTime(lastUpdatedAt);
  const feedBusy = status === 'loading' || isRefreshing;

  return (
    <>
      <Card className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Activités de tes amis
            </p>
            <h2 className="mt-1 text-xl font-bold text-slate-950 dark:text-white">
              Fil d’activité
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
              Les activités que tes amis ont choisi de partager avec toi.
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span className="hidden rounded-2xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 sm:inline dark:border-slate-800 dark:text-slate-200">
              {countLabel}
            </span>
            <Button
              aria-label={isRefreshing ? 'Actualisation du fil en cours' : 'Actualiser le fil'}
              className="size-11 px-0"
              disabled={feedBusy}
              size="sm"
              title="Actualiser le fil"
              variant="secondary"
              onClick={() => void loadPage('replace')}
            >
              <RefreshCw aria-hidden="true" className={`size-4 ${feedBusy ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        <div className="mt-3 flex min-h-5 items-center justify-between gap-3 text-xs font-semibold text-slate-500 dark:text-slate-400" aria-live="polite">
          <span className="sm:hidden">{countLabel}</span>
          {isRefreshing ? <span>Actualisation…</span> : refreshTime ? <span>À jour à {refreshTime}</span> : <span />}
        </div>

        {status === 'loading' ? (
          <p className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300" role="status">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Chargement du fil…
          </p>
        ) : null}

        {status === 'authRequired' ? (
          <InlineNotice title="Compte requis"><p>{message}</p></InlineNotice>
        ) : null}

        {status === 'offline' ? (
          <InlineNotice title="Mode hors ligne"><p className="inline-flex items-center gap-2"><WifiOff aria-hidden="true" className="size-4" />{message}</p></InlineNotice>
        ) : null}

        {status === 'error' ? (
          <InlineNotice tone="error" title="Fil indisponible">
            <p>{message}</p>
            <Button className="mt-3 min-h-11" size="sm" variant="secondary" onClick={() => void loadPage('replace')}>
              <RefreshCw aria-hidden="true" className="size-4" />
              Réessayer
            </Button>
          </InlineNotice>
        ) : null}

        {status === 'empty' ? (
          <div className="mt-4 rounded-2xl border border-dashed border-slate-300 p-4 text-sm leading-6 text-slate-600 dark:border-slate-700 dark:text-slate-300">
            <p className="font-semibold text-slate-800 dark:text-slate-100">Le fil est vide pour le moment.</p>
            <p>Tes prochaines activités partagées apparaîtront ici automatiquement.</p>
          </div>
        ) : null}

        {message && status === 'ready' ? (
          <InlineNotice title="Fil conservé"><p>{message}</p></InlineNotice>
        ) : null}

        {items.length > 0 ? (
          <div
            ref={feedListRef}
            aria-busy={feedBusy || isLoadingMore}
            className="mt-4 space-y-3"
          >
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
            className="mt-4 min-h-11 w-full"
            disabled={isLoadingMore || isRefreshing}
            variant="secondary"
            onClick={() => void loadPage('append')}
          >
            {isLoadingMore
              ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              : <ChevronDown aria-hidden="true" className="size-4" />}
            {isLoadingMore ? 'Chargement…' : 'Afficher plus d’activités'}
          </Button>
        ) : null}

        <p className="mt-4 flex items-start gap-2 border-t border-slate-200 pt-4 text-xs font-semibold leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Seules les informations autorisées par chaque ami sont chargées.
        </p>
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
