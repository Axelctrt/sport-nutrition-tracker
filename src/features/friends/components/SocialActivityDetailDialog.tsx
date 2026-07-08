import { LoaderCircle, ShieldCheck, X } from 'lucide-react';
import { useEffect, useId, useRef } from 'react';

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

const focusableSelector = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function SocialActivityDetailDialog({
  detailState,
  onClose,
}: SocialActivityDetailDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dialogRef = useRef<HTMLElement>(null);
  const previouslyFocusedElementRef = useRef<HTMLElement | null>(null);
  const descriptionId = useId();

  useEffect(() => {
    previouslyFocusedElementRef.current = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab' || !dialogRef.current) return;

      const focusableElements = [...dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector)]
        .filter((element) => !element.hasAttribute('disabled') && element.tabIndex !== -1);
      if (focusableElements.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusableElements.at(0)!;
      const last = focusableElements.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
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
  const summaryOnly = snapshot?.visibility === 'summary';
  const hasStructuredDetail = Boolean(snapshot?.detail);
  const activityType = snapshot?.activityType ?? detailState.card.activityType;
  const occurredOn = snapshot?.occurredOn ?? detailState.card.occurredOn;
  const occurredTime = snapshot?.occurredTime ?? detailState.card.occurredTime;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/60 p-0 sm:items-center sm:p-4"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section
        ref={dialogRef}
        aria-describedby={descriptionId}
        aria-labelledby="social-activity-detail-title"
        aria-modal="true"
        className="max-h-[92dvh] w-full overflow-y-auto overscroll-contain rounded-t-3xl bg-white shadow-2xl sm:max-w-3xl sm:rounded-3xl dark:bg-slate-900"
        role="dialog"
      >
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/95 px-5 py-4 backdrop-blur sm:rounded-t-3xl sm:px-6 dark:border-slate-800 dark:bg-slate-900/95">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300 sm:hidden dark:bg-slate-700" aria-hidden="true" />
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold uppercase tracking-wide text-brand-700 dark:text-brand-300">
                  Activité partagée
                </p>
                {snapshot ? (
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {summaryOnly ? 'Résumé' : 'Personnalisé'}
                  </span>
                ) : null}
              </div>
              <h3
                id="social-activity-detail-title"
                className="mt-1 break-words text-2xl font-bold text-slate-950 dark:text-white"
              >
                {title}
              </h3>
              <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-400">
                {socialActivityOwnerDisplayName(detailState.card)} · {socialActivityLabel(activityType)} · {formatSocialActivityExactDate(occurredOn, occurredTime)}
              </p>
            </div>
            <Button
              ref={closeButtonRef}
              aria-label="Fermer l’activité"
              className="size-11 shrink-0 px-0"
              size="sm"
              variant="ghost"
              onClick={onClose}
            >
              <X aria-hidden="true" className="size-5" />
            </Button>
          </div>
        </header>

        <div className="space-y-5 px-5 py-5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] sm:px-6 sm:py-6">
          {detailState.status === 'loading' ? (
            <p className="inline-flex min-h-16 items-center gap-2 text-sm font-semibold text-slate-600 dark:text-slate-300" role="status">
              <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />
              Vérification des autorisations…
            </p>
          ) : null}

          {detailState.status === 'error' ? (
            <InlineNotice tone="error" title="Activité indisponible">
              <p>{detailState.message}</p>
            </InlineNotice>
          ) : null}

          {detailState.status === 'ready' && snapshot ? (
            <>
              {summaryMetrics.length > 0 ? (
                <SocialActivitySummaryMetrics metrics={summaryMetrics} variant="detail" />
              ) : (
                <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
                  Aucune métrique supplémentaire n’est disponible pour cette activité.
                </p>
              )}

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

              {!hasStructuredDetail ? (
                <InlineNotice title={summaryOnly ? 'Résumé uniquement' : 'Informations disponibles'}>
                  <p>
                    {summaryOnly
                      ? 'Ton ami partage uniquement le résumé affiché ci-dessus.'
                      : 'Les champs autorisés sont affichés ci-dessus. Les autres données sont masquées ou n’étaient pas disponibles.'}
                  </p>
                </InlineNotice>
              ) : null}

              <p className="flex items-start gap-2 border-t border-slate-200 pt-4 text-xs font-semibold leading-5 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
                Les autorisations sont revérifiées par le serveur à chaque ouverture. Les données non partagées ne sont pas envoyées à ton appareil.
              </p>
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
