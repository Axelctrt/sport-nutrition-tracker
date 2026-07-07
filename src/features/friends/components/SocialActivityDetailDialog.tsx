import { LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

import type { SocialActivityCloudFeedCard } from '@/domain/friends/socialActivityCloudFeed';
import type { ActiveSocialActivitySnapshot } from '@/domain/friends/socialActivitySnapshotContract';
import { SocialCardioActivityDetail } from '@/features/friends/components/SocialCardioActivityDetail';
import { SocialStrengthActivityDetail } from '@/features/friends/components/SocialStrengthActivityDetail';
import { SocialActivitySummaryMetrics } from '@/features/friends/components/SocialActivitySummaryMetrics';
import {
  formatSocialActivityExactDate,
  presentSocialActivitySummary,
  socialActivityLabel,
  socialActivityOwnerDisplayName,
} from '@/features/friends/components/socialActivityFeedPresentation';
import { muscleGroupLabel } from '@/features/strength-exercises/utils/exerciseLabels';
import { Button } from '@/shared/ui/Button';
import { InlineNotice } from '@/shared/ui/InlineNotice';

export interface SocialActivityDetailState {
  readonly card: SocialActivityCloudFeedCard;
  readonly status: 'loading' | 'ready' | 'error';
  readonly snapshot?: ActiveSocialActivitySnapshot;
  readonly message?: string;
}

interface SocialActivityDetailDialogProps {
  readonly detailState: SocialActivityDetailState;
  readonly onClose: () => void;
}

export function SocialActivityDetailDialog({
  detailState,
  onClose,
}: SocialActivityDetailDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocusedElementRef.current?.focus();
    };
  }, [onClose]);

  const snapshot = detailState.snapshot;
  const title = snapshot?.title
    || detailState.card.title
    || socialActivityLabel(detailState.card.activityType);
  const summaryMetrics = snapshot ? presentSocialActivitySummary(snapshot.summary) : [];

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        aria-labelledby="social-activity-detail-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl dark:bg-slate-900"
        role="dialog"
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:rounded-t-3xl sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                Détail partagé
              </p>
              <h3
                id="social-activity-detail-title"
                className="mt-1 break-words text-2xl font-bold text-slate-950 dark:text-white"
              >
                {title}
              </h3>
              <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {socialActivityOwnerDisplayName(detailState.card)} · {formatSocialActivityExactDate(detailState.card.occurredOn, detailState.card.occurredTime)}
              </p>
            </div>
            <Button
              ref={closeButtonRef}
              aria-label="Fermer le détail"
              className="size-11 shrink-0 px-0"
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 sm:px-6 sm:py-6">
          {detailState.status === 'loading' ? (
            <p className="inline-flex min-h-16 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300" role="status">
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
            <>
              <SocialActivitySummaryMetrics metrics={summaryMetrics} variant="detail" />

              {snapshot.summary.muscleGroups?.length ? (
                <section className="rounded-2xl bg-slate-50 p-4 dark:bg-slate-950/70">
                  <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                    Groupes musculaires
                  </h4>
                  <p className="mt-2 text-sm font-semibold leading-6 text-slate-800 dark:text-slate-200">
                    {snapshot.summary.muscleGroups.map(muscleGroupLabel).join(' · ')}
                  </p>
                </section>
              ) : null}

              {snapshot.detail?.family === 'cardio' ? (
                <SocialCardioActivityDetail
                  detail={snapshot.detail}
                  activityType={snapshot.activityType}
                />
              ) : null}
              {snapshot.detail?.family === 'strength' ? (
                <SocialStrengthActivityDetail detail={snapshot.detail} />
              ) : null}
              {snapshot.detail?.family === 'generic' ? (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  Aucun détail complémentaire n’a été partagé pour cette activité.
                </p>
              ) : null}

              <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs font-semibold leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Seuls les champs autorisés par le propriétaire et revérifiés par le serveur sont affichés.
              </p>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
