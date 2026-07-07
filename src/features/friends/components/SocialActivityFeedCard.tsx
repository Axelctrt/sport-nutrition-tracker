import {
  Bike,
  ChevronRight,
  Dumbbell,
  Flame,
  Footprints,
  PersonStanding,
  Waves,
  type LucideIcon,
} from 'lucide-react';

import type { SocialActivityCloudFeedCard } from '@/domain/friends/socialActivityCloudFeed';
import type { ActivityType } from '@/domain/models/activity';
import {
  formatSocialActivityExactDate,
  formatSocialActivityRelativeDate,
  presentSocialActivitySummary,
  socialActivityLabel,
  socialActivityOwnerDisplayName,
} from '@/features/friends/components/socialActivityFeedPresentation';
import { SocialActivitySummaryMetrics } from '@/features/friends/components/SocialActivitySummaryMetrics';
import { Button } from '@/shared/ui/Button';
import { cn } from '@/shared/utils/cn';

interface SocialActivityFeedCardProps {
  readonly card: SocialActivityCloudFeedCard;
  readonly onOpenDetail: (card: SocialActivityCloudFeedCard) => void;
}

const iconByType: Record<ActivityType, LucideIcon> = {
  running: PersonStanding,
  swimming: Waves,
  strengthTraining: Dumbbell,
  cycling: Bike,
  walking: Footprints,
  otherCardio: Flame,
};

const toneByType: Record<ActivityType, string> = {
  running: 'bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-200',
  swimming: 'bg-sky-100 text-sky-800 dark:bg-sky-950/60 dark:text-sky-200',
  strengthTraining: 'bg-violet-100 text-violet-800 dark:bg-violet-950/60 dark:text-violet-200',
  cycling: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-200',
  walking: 'bg-lime-100 text-lime-800 dark:bg-lime-950/60 dark:text-lime-200',
  otherCardio: 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-200',
};

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

export function SocialActivityFeedCard({ card, onOpenDetail }: SocialActivityFeedCardProps) {
  const Icon = iconByType[card.activityType];
  const metrics = presentSocialActivitySummary(card.summary);
  const displayedMetrics = card.detailAvailable ? metrics.slice(0, 4) : metrics;
  const hiddenMetricCount = metrics.length - displayedMetrics.length;
  const title = card.title || socialActivityLabel(card.activityType);

  return (
    <article className="rounded-2xl border border-slate-200 p-4 shadow-sm dark:border-slate-800 sm:p-5">
      <header className="flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex size-12 items-center justify-center rounded-full bg-brand-100 text-sm font-bold text-brand-700 dark:bg-brand-950 dark:text-brand-200">
            {initialsFor(card)}
          </div>
          <span
            className={cn(
              'absolute -bottom-1 -right-1 grid size-6 place-items-center rounded-full ring-2 ring-white dark:ring-slate-900',
              toneByType[card.activityType],
            )}
          >
            <Icon aria-hidden="true" className="size-3.5" />
          </span>
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="truncate font-semibold text-slate-950 dark:text-white">
                {socialActivityOwnerDisplayName(card)}
              </p>
              {card.ownerProfile.handle ? (
                <p className="truncate text-sm text-slate-500 dark:text-slate-400">
                  @{card.ownerProfile.handle}
                </p>
              ) : null}
            </div>
            <time
              className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400"
              dateTime={card.occurredTime ? `${card.occurredOn}T${card.occurredTime}` : card.occurredOn}
              title={formatSocialActivityExactDate(card.occurredOn, card.occurredTime)}
            >
              {formatSocialActivityRelativeDate(card.occurredOn)}
            </time>
          </div>
        </div>
      </header>

      <div className="mt-4">
        <div className="flex items-start gap-3">
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-2xl', toneByType[card.activityType])}>
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="break-words text-lg font-bold text-slate-950 dark:text-white">{title}</h3>
            <p className="mt-0.5 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
              {socialActivityLabel(card.activityType)} · {card.visibility === 'summary' ? 'Résumé partagé' : 'Détail autorisé'}
            </p>
          </div>
        </div>

        {displayedMetrics.length > 0 ? (
          <div className="mt-4">
            <SocialActivitySummaryMetrics metrics={displayedMetrics} />
            {hiddenMetricCount > 0 ? (
              <p className="mt-2 text-xs font-semibold text-slate-500 dark:text-slate-400">
                + {hiddenMetricCount} métrique{hiddenMetricCount > 1 ? 's' : ''} dans le détail autorisé
              </p>
            ) : null}
          </div>
        ) : null}

        {card.detailAvailable ? (
          <Button
            className="mt-4 min-h-11 w-full sm:w-auto"
            size="sm"
            variant="secondary"
            onClick={() => onOpenDetail(card)}
          >
            Voir le détail autorisé
            <ChevronRight aria-hidden="true" className="size-4" />
          </Button>
        ) : (
          <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
            Cette activité est partagée en résumé uniquement.
          </p>
        )}
      </div>
    </article>
  );
}
