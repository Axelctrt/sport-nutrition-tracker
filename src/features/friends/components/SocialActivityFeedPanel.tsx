import {
  Activity,
  ChevronDown,
  ChevronRight,
  Dumbbell,
  LoaderCircle,
  RefreshCw,
  Route,
  Timer,
  WifiOff,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { SocialActivityCloudFeedCard } from '@/domain/friends/socialActivityCloudFeed';
import type {
  ActiveSocialActivitySnapshot,
  SocialActivitySnapshotSummary,
  SocialCardioActivitySnapshotDetail,
  SocialStrengthActivitySnapshotDetail,
  SocialStrengthSetSnapshot,
} from '@/domain/friends/socialActivitySnapshotContract';
import type { ActivityType } from '@/domain/models/activity';
import type { SocialActivitySnapshotCloudCredentials } from '@/infrastructure/social-activity-snapshots/socialActivitySnapshotCloudGateway';
import {
  SocialActivityFeedCloudError,
  type SocialActivityFeedCloudGateway,
} from '@/infrastructure/social-activity-snapshots/socialActivityFeedCloudGateway';
import { muscleGroupLabel } from '@/features/strength-exercises/utils/exerciseLabels';
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

interface DetailState {
  readonly card: SocialActivityCloudFeedCard;
  readonly status: 'loading' | 'ready' | 'error';
  readonly snapshot?: ActiveSocialActivitySnapshot;
  readonly message?: string;
}

const activityLabels: Record<ActivityType, string> = {
  running: 'Course',
  swimming: 'Natation',
  strengthTraining: 'Musculation',
  cycling: 'Vélo',
  walking: 'Marche',
  otherCardio: 'Cardio',
};

function formatExactDate(value: string, time?: string): string {
  const date = new Date(`${value}T${time ?? '12:00'}:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(time ? { hour: '2-digit', minute: '2-digit' } : {}),
  }).format(date);
}

function formatRelativeDate(value: string): string {
  const activityDate = new Date(`${value}T12:00:00`);
  if (Number.isNaN(activityDate.getTime())) return value;
  const today = new Date();
  const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const activityStart = new Date(
    activityDate.getFullYear(),
    activityDate.getMonth(),
    activityDate.getDate(),
  ).getTime();
  const dayDifference = Math.round((activityStart - todayStart) / 86_400_000);
  if (dayDifference === 0) return "Aujourd’hui";
  if (dayDifference === -1) return 'Hier';
  if (dayDifference > -7 && dayDifference < 0) {
    return new Intl.RelativeTimeFormat('fr-FR', { numeric: 'auto' }).format(dayDifference, 'day');
  }
  return formatExactDate(value);
}

function initialsFor(card: SocialActivityCloudFeedCard): string {
  const displayName = card.ownerProfile.displayName?.trim();
  if (displayName) {
    return displayName
      .split(/\s+/u)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');
  }
  const handle = card.ownerProfile.handle?.trim();
  return handle?.slice(0, 2).toUpperCase() || 'SP';
}

function displayNameFor(card: SocialActivityCloudFeedCard): string {
  return card.ownerProfile.displayName?.trim() || 'Ami SportPilot';
}

function formatPace(value: number): string {
  const minutes = Math.floor(value);
  const seconds = Math.round((value - minutes) * 60);
  return `${minutes}'${String(seconds).padStart(2, '0')}"/km`;
}

function formatSwimPace(value: number): string {
  const minutes = Math.floor(value / 60);
  const seconds = Math.round(value % 60);
  return `${minutes}'${String(seconds).padStart(2, '0')}"/100 m`;
}

function summaryLabels(summary: SocialActivitySnapshotSummary): readonly string[] {
  return [
    summary.durationMinutes === undefined ? undefined : `${summary.durationMinutes} min`,
    summary.distanceKm === undefined ? undefined : `${summary.distanceKm} km`,
    summary.distanceMeters === undefined ? undefined : `${summary.distanceMeters} m`,
    summary.paceMinutesPerKm === undefined ? undefined : formatPace(summary.paceMinutesPerKm),
    summary.paceSecondsPer100Meters === undefined
      ? undefined
      : formatSwimPace(summary.paceSecondsPer100Meters),
    summary.speedKph === undefined ? undefined : `${summary.speedKph} km/h`,
    summary.elevationGainMeters === undefined ? undefined : `D+ ${summary.elevationGainMeters} m`,
    summary.caloriesKcal === undefined ? undefined : `${summary.caloriesKcal} kcal`,
    summary.averageHeartRateBpm === undefined ? undefined : `${summary.averageHeartRateBpm} bpm`,
    summary.averageCadencePerMinute === undefined
      ? undefined
      : `${summary.averageCadencePerMinute} pas/min`,
    summary.exerciseCount === undefined
      ? undefined
      : `${summary.exerciseCount} exercice${summary.exerciseCount > 1 ? 's' : ''}`,
    summary.volumeKg === undefined ? undefined : `${summary.volumeKg} kg de volume`,
  ].filter((label): label is string => Boolean(label));
}

function setLabel(set: SocialStrengthSetSnapshot): string {
  const parts = [
    set.loadKg === undefined ? undefined : `${set.loadKg} kg`,
    set.repetitions === undefined ? undefined : `${set.repetitions} répétitions`,
    set.durationSeconds === undefined ? undefined : `${set.durationSeconds} s`,
    set.distanceMeters === undefined ? undefined : `${set.distanceMeters} m`,
    set.rpe === undefined ? undefined : `RPE ${set.rpe}`,
    set.restSeconds === undefined ? undefined : `repos ${set.restSeconds} s`,
  ].filter((part): part is string => Boolean(part));
  return parts.length > 0 ? parts.join(' · ') : `Série ${set.setNumber}`;
}

function CardioDetail({ detail }: { readonly detail: SocialCardioActivitySnapshotDetail }) {
  const labels = [
    detail.sessionType,
    detail.terrainType,
    detail.mainStroke,
    detail.poolLengthMeters === undefined ? undefined : `Bassin ${detail.poolLengthMeters} m`,
    detail.bikeType,
    detail.environment,
  ].filter((label): label is string => Boolean(label));

  return (
    <div className="space-y-4">
      {labels.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {labels.map((label) => (
            <span key={label} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {detail.intervals?.length ? (
        <section>
          <h4 className="font-bold text-slate-950 dark:text-white">Intervalles</h4>
          <div className="mt-2 space-y-2">
            {detail.intervals.map((interval, index) => (
              <div key={`${interval.label}-${index}`} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <p className="font-semibold text-slate-950 dark:text-white">{interval.label}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {[
                    interval.durationSeconds === undefined ? undefined : `${interval.durationSeconds} s`,
                    interval.distanceMeters === undefined ? undefined : `${interval.distanceMeters} m`,
                    interval.paceMinutesPerKm === undefined ? undefined : formatPace(interval.paceMinutesPerKm),
                    interval.paceSecondsPer100Meters === undefined
                      ? undefined
                      : formatSwimPace(interval.paceSecondsPer100Meters),
                    interval.speedKph === undefined ? undefined : `${interval.speedKph} km/h`,
                  ].filter(Boolean).join(' · ') || 'Détail autorisé sans métrique supplémentaire.'}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {detail.laps?.length ? (
        <section>
          <h4 className="font-bold text-slate-950 dark:text-white">Tours</h4>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {detail.laps.map((lap) => (
              <div key={lap.lapNumber} className="rounded-xl border border-slate-200 p-3 text-sm dark:border-slate-800">
                <p className="font-semibold text-slate-950 dark:text-white">Tour {lap.lapNumber}</p>
                <p className="mt-1 text-slate-600 dark:text-slate-300">
                  {[
                    lap.durationSeconds === undefined ? undefined : `${lap.durationSeconds} s`,
                    lap.distanceMeters === undefined ? undefined : `${lap.distanceMeters} m`,
                    lap.paceMinutesPerKm === undefined ? undefined : formatPace(lap.paceMinutesPerKm),
                    lap.paceSecondsPer100Meters === undefined
                      ? undefined
                      : formatSwimPace(lap.paceSecondsPer100Meters),
                    lap.speedKph === undefined ? undefined : `${lap.speedKph} km/h`,
                  ].filter(Boolean).join(' · ')}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {detail.chart?.points.length ? (
        <p className="rounded-xl bg-slate-50 p-3 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          Série graphique autorisée : {detail.chart.points.length} point{detail.chart.points.length > 1 ? 's' : ''} pour la métrique « {detail.chart.metric} ». La visualisation interactive sera finalisée dans la phase cardio dédiée.
        </p>
      ) : null}
    </div>
  );
}

function StrengthDetail({ detail }: { readonly detail: SocialStrengthActivitySnapshotDetail }) {
  return (
    <div className="space-y-3">
      {detail.exercises?.map((exercise, exerciseIndex) => (
        <section key={`${exercise.name}-${exerciseIndex}`} className="rounded-2xl border border-slate-200 p-4 dark:border-slate-800">
          <h4 className="font-bold text-slate-950 dark:text-white">{exercise.name}</h4>
          {exercise.muscleGroups?.length ? (
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {exercise.muscleGroups.map(muscleGroupLabel).join(' · ')}
            </p>
          ) : null}
          {exercise.sets?.length ? (
            <ol className="mt-3 space-y-2">
              {exercise.sets.map((set) => (
                <li key={set.setNumber} className="rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:bg-slate-950 dark:text-slate-200">
                  <span className="font-semibold">Série {set.setNumber}</span> · {setLabel(set)}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">Aucune série détaillée autorisée.</p>
          )}
        </section>
      ))}
    </div>
  );
}

function ActivityDetailDialog({
  detailState,
  onClose,
}: {
  readonly detailState: DetailState;
  readonly onClose: () => void;
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  const snapshot = detailState.snapshot;
  const title = snapshot?.title || detailState.card.title || activityLabels[detailState.card.activityType];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose();
    }}>
      <section
        aria-labelledby="social-activity-detail-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-2xl sm:rounded-3xl sm:p-6 dark:bg-slate-900"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
              Détail partagé
            </p>
            <h3 id="social-activity-detail-title" className="mt-1 text-2xl font-bold text-slate-950 dark:text-white">
              {title}
            </h3>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {displayNameFor(detailState.card)} · {formatExactDate(detailState.card.occurredOn, detailState.card.occurredTime)}
            </p>
          </div>
          <Button aria-label="Fermer le détail" className="shrink-0" size="sm" variant="ghost" onClick={onClose}>
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        {detailState.status === 'loading' ? (
          <p className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
            Chargement du détail autorisé…
          </p>
        ) : null}

        {detailState.status === 'error' ? (
          <InlineNotice tone="error" title="Détail indisponible">
            <p>{detailState.message}</p>
          </InlineNotice>
        ) : null}

        {detailState.status === 'ready' && snapshot ? (
          <div className="mt-5 space-y-5">
            <div className="flex flex-wrap gap-2">
              {summaryLabels(snapshot.summary).map((label) => (
                <span key={label} className="rounded-full bg-brand-50 px-3 py-1 text-sm font-semibold text-brand-900 dark:bg-brand-950/50 dark:text-brand-100">
                  {label}
                </span>
              ))}
            </div>

            {snapshot.summary.muscleGroups?.length ? (
              <p className="text-sm text-slate-600 dark:text-slate-300">
                Groupes musculaires : {snapshot.summary.muscleGroups.map(muscleGroupLabel).join(', ')}
              </p>
            ) : null}

            {snapshot.detail?.family === 'cardio' ? <CardioDetail detail={snapshot.detail} /> : null}
            {snapshot.detail?.family === 'strength' ? <StrengthDetail detail={snapshot.detail} /> : null}
            {snapshot.detail?.family === 'generic' ? (
              <p className="rounded-xl bg-slate-50 p-3 text-sm text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                Aucun détail complémentaire n’a été partagé pour cette activité.
              </p>
            ) : null}

            <p className="border-t border-slate-200 pt-4 text-xs font-semibold text-slate-500 dark:border-slate-800 dark:text-slate-400">
              Seuls les champs autorisés par le propriétaire et validés par le serveur sont affichés.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [detailState, setDetailState] = useState<DetailState>();

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

  const openDetail = async (card: SocialActivityCloudFeedCard) => {
    setDetailState({ card, status: 'loading' });
    const credentials = getCredentials();
    if (!credentials) {
      setDetailState({
        card,
        status: 'error',
        message: 'Reconnecte ton compte SportPilot pour ouvrir ce détail.',
      });
      return;
    }
    if (!isOnline()) {
      setDetailState({
        card,
        status: 'error',
        message: 'Le détail complet nécessite une connexion réseau afin de revérifier les permissions.',
      });
      return;
    }
    try {
      const snapshot = await gateway.readDetail(credentials, card.snapshotId);
      if (snapshot.snapshotId !== card.snapshotId) {
        throw new Error('Réponse de détail incohérente.');
      }
      setDetailState({ card, status: 'ready', snapshot });
    } catch (error) {
      setDetailState({
        card,
        status: 'error',
        message: error instanceof Error ? error.message : 'Le détail autorisé n’a pas pu être chargé.',
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
            <Button aria-label="Actualiser le fil" disabled={status === 'loading'} size="sm" variant="secondary" onClick={() => void loadPage('replace')}>
              <RefreshCw aria-hidden="true" className={`size-4 ${status === 'loading' ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>

        {status === 'loading' ? (
          <p className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
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
            {items.map((card) => {
              const metrics = summaryLabels(card.summary);
              const title = card.title || activityLabels[card.activityType];
              return (
                <article key={card.snapshotId} className="rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-800">
                  <div className="flex items-start gap-3">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
                      {initialsFor(card)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-slate-950 dark:text-white">{displayNameFor(card)}</p>
                          {card.ownerProfile.handle ? (
                            <p className="truncate text-sm text-slate-500 dark:text-slate-400">@{card.ownerProfile.handle}</p>
                          ) : null}
                        </div>
                        <p className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400" title={formatExactDate(card.occurredOn, card.occurredTime)}>
                          {formatRelativeDate(card.occurredOn)}
                        </p>
                      </div>

                      <div className="mt-3 flex items-center gap-2">
                        {card.family === 'strength' ? <Dumbbell aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" /> : <Activity aria-hidden="true" className="size-4 text-brand-700 dark:text-brand-300" />}
                        <h3 className="font-bold text-slate-950 dark:text-white">{title}</h3>
                      </div>
                      <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                        {activityLabels[card.activityType]} · {card.visibility === 'summary' ? 'Résumé partagé' : 'Détail autorisé'}
                      </p>

                      {metrics.length > 0 ? (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {metrics.map((label) => (
                            <span key={label} className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                              {label}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {card.detailAvailable ? (
                        <Button className="mt-4 w-full sm:w-auto" size="sm" variant="secondary" onClick={() => void openDetail(card)}>
                          Voir le détail autorisé
                          <ChevronRight aria-hidden="true" className="size-4" />
                        </Button>
                      ) : (
                        <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                          Cette activité est partagée en résumé uniquement.
                        </p>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        ) : null}

        {nextCursor ? (
          <Button className="mt-5 w-full" disabled={isLoadingMore} variant="secondary" onClick={() => void loadPage('append')}>
            {isLoadingMore ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <ChevronDown aria-hidden="true" className="size-4" />}
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
        <ActivityDetailDialog detailState={detailState} onClose={() => setDetailState(undefined)} />
      ) : null}
    </>
  );
}
