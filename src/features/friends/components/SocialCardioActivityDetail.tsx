import type {
  SocialActivityIntervalSnapshot,
  SocialActivityLapSnapshot,
  SocialActivitySegmentSnapshot,
  SocialCardioActivitySnapshotDetail,
} from '@/domain/friends/socialActivitySnapshotContract';
import type { ActivityType } from '@/domain/models/activity';
import { SocialActivityDetailChart } from '@/features/friends/components/SocialActivityDetailChart';
import {
  formatSocialActivityElapsedTime,
  formatSocialActivityPace,
  formatSocialActivitySwimPace,
  presentSocialActivityChart,
  presentSocialCardioTags,
} from '@/features/friends/components/socialActivityFeedPresentation';

interface SocialCardioActivityDetailProps {
  readonly detail: SocialCardioActivitySnapshotDetail;
  readonly activityType: ActivityType;
}

type StructuredCardioBlock =
  | SocialActivityIntervalSnapshot
  | SocialActivityLapSnapshot
  | SocialActivitySegmentSnapshot;

function cardioBlockMetrics(block: StructuredCardioBlock): readonly string[] {
  return [
    block.durationSeconds === undefined
      ? undefined
      : formatSocialActivityElapsedTime(block.durationSeconds),
    block.distanceMeters === undefined ? undefined : `${block.distanceMeters.toLocaleString('fr-FR')} m`,
    block.paceMinutesPerKm === undefined
      ? undefined
      : formatSocialActivityPace(block.paceMinutesPerKm),
    block.paceSecondsPer100Meters === undefined
      ? undefined
      : formatSocialActivitySwimPace(block.paceSecondsPer100Meters),
    block.speedKph === undefined
      ? undefined
      : `${block.speedKph.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h`,
    'elevationGainMeters' in block && block.elevationGainMeters !== undefined
      ? `D+ ${block.elevationGainMeters.toLocaleString('fr-FR')} m`
      : undefined,
  ].filter((value): value is string => Boolean(value));
}

function CardioBlockList({
  title,
  items,
  labelFor,
}: {
  readonly title: string;
  readonly items: readonly StructuredCardioBlock[];
  readonly labelFor: (item: StructuredCardioBlock, index: number) => string;
}) {
  return (
    <section>
      <h4 className="font-bold text-slate-950 dark:text-white">{title}</h4>
      <ol className="mt-2 grid gap-2 sm:grid-cols-2">
        {items.map((item, index) => {
          const metrics = cardioBlockMetrics(item);
          return (
            <li
              key={`${labelFor(item, index)}-${index}`}
              className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800"
            >
              <p className="font-semibold text-slate-950 dark:text-white">
                {labelFor(item, index)}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
                {metrics.length > 0
                  ? metrics.join(' · ')
                  : 'Aucune métrique supplémentaire n’est incluse dans ce partage.'}
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export function SocialCardioActivityDetail({
  detail,
  activityType,
}: SocialCardioActivityDetailProps) {
  const tags = presentSocialCardioTags(detail, activityType);
  const chart = presentSocialActivityChart(detail);

  return (
    <div className="space-y-5">
      {tags.length > 0 ? (
        <div className="flex flex-wrap gap-2" aria-label="Caractéristiques partagées">
          {tags.map((label) => (
            <span
              key={label}
              className="rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}

      {chart ? <SocialActivityDetailChart chart={chart} /> : null}

      {detail.intervals?.length ? (
        <CardioBlockList
          title="Intervalles"
          items={detail.intervals}
          labelFor={(item, index) => 'label' in item ? item.label : `Intervalle ${index + 1}`}
        />
      ) : null}

      {detail.laps?.length ? (
        <CardioBlockList
          title="Tours"
          items={detail.laps}
          labelFor={(item, index) => 'lapNumber' in item ? `Tour ${item.lapNumber}` : `Tour ${index + 1}`}
        />
      ) : null}

      {detail.segments?.length ? (
        <CardioBlockList
          title="Segments"
          items={detail.segments}
          labelFor={(item, index) => 'label' in item ? item.label : `Segment ${index + 1}`}
        />
      ) : null}

      {!chart && !detail.intervals?.length && !detail.laps?.length && !detail.segments?.length && tags.length === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-600 dark:bg-slate-950 dark:text-slate-300">
          Aucune donnée cardio complémentaire n’a été partagée pour cette activité.
        </p>
      ) : null}
    </div>
  );
}
