import { Minus, Scale, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { calculateWeightMovingAverage } from '@/domain/aggregations/analytics';
import type { UserProfile } from '@/domain/models/profile';
import type { WeightEntry } from '@/domain/models/weight';
import { Card } from '@/shared/ui/Card';
import { formatLocalDate } from '@/shared/utils/dates';

interface WeightSummaryProps {
  entries: readonly WeightEntry[];
  profile: UserProfile;
}

function formatWeight(value: number): string {
  return `${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;
}

function formatSignedWeight(value: number): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR', { maximumFractionDigits: 2 })} kg`;
}

function TrendIcon({ value }: { value: number | undefined }) {
  if (value === undefined || Math.abs(value) < 0.005) {
    return <Minus aria-hidden="true" className="size-4" />;
  }
  return value > 0
    ? <TrendingUp aria-hidden="true" className="size-4" />
    : <TrendingDown aria-hidden="true" className="size-4" />;
}

export function WeightSummary({ entries, profile }: WeightSummaryProps) {
  const ordered = [...entries].sort((left, right) => left.date.localeCompare(right.date));
  const latestEntry = ordered.at(-1);
  const previousEntry = ordered.at(-2);
  const latestPoint = calculateWeightMovingAverage(ordered, profile).at(-1);
  const currentWeight = latestEntry?.weightKg ?? profile.initialWeightKg;
  const changeFromPrevious = latestEntry && previousEntry
    ? latestEntry.weightKg - previousEntry.weightKg
    : undefined;
  const trajectoryGap = latestPoint
    ? latestPoint.movingAverageKg - latestPoint.targetWeightKg
    : undefined;

  return (
    <Card className="mt-5 overflow-hidden p-4 sm:p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
            {latestEntry ? 'Dernière pesée' : 'Poids de référence'}
          </p>
          <p className="mt-1 text-3xl font-bold tabular-nums tracking-tight text-slate-950 dark:text-white">
            {formatWeight(currentWeight)}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {latestEntry
              ? formatLocalDate(latestEntry.date, 'EEEE d MMMM yyyy')
              : 'Valeur initiale enregistrée dans le profil'}
          </p>
        </div>
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-200">
          <Scale aria-hidden="true" className="size-6" />
        </span>
      </div>

      <div className="mt-5 grid grid-cols-3 gap-px overflow-hidden rounded-xl bg-slate-200 dark:bg-slate-800">
        <div className="min-w-0 bg-white px-2 py-3 text-center dark:bg-slate-900 sm:px-3">
          <p className="text-[0.7rem] font-medium leading-4 text-slate-500 dark:text-slate-400">Moyenne 7 j</p>
          <p className="mt-1 truncate text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
            {latestPoint ? formatWeight(latestPoint.movingAverageKg) : '—'}
          </p>
        </div>
        <div className="min-w-0 bg-white px-2 py-3 text-center dark:bg-slate-900 sm:px-3">
          <p className="text-[0.7rem] font-medium leading-4 text-slate-500 dark:text-slate-400">Variation</p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
            <TrendIcon value={changeFromPrevious} />
            {changeFromPrevious === undefined ? '—' : formatSignedWeight(changeFromPrevious)}
          </p>
        </div>
        <div className="min-w-0 bg-white px-2 py-3 text-center dark:bg-slate-900 sm:px-3">
          <p className="text-[0.7rem] font-medium leading-4 text-slate-500 dark:text-slate-400">Écart trajectoire</p>
          <p className="mt-1 inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-slate-950 dark:text-white">
            <Target aria-hidden="true" className="size-4" />
            {trajectoryGap === undefined ? '—' : formatSignedWeight(trajectoryGap)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">
        {entries.length === 0
          ? 'Ajoute une première pesée pour suivre la moyenne mobile et la trajectoire.'
          : `${entries.length} ${entries.length > 1 ? 'pesées enregistrées' : 'pesée enregistrée'}. La trajectoire suit l’objectif hebdomadaire du profil.`}
      </p>
    </Card>
  );
}
