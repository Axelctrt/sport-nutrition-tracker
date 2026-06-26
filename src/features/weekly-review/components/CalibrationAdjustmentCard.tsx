import { Gauge } from 'lucide-react';
import type { AcceptedCalorieAdjustment } from '@/domain/models/weeklyReview';
import { formatLocalDate } from '@/shared/utils/dates';

function formatSigned(value: number, unit: string): string {
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toLocaleString('fr-FR')} ${unit}`;
}

export function CalibrationAdjustmentCard({ adjustment }: { adjustment: AcceptedCalorieAdjustment }) {
  return (
    <article className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Gauge aria-hidden="true" className="size-4 text-slate-500" />
          <h3 className="text-sm font-semibold text-slate-950 dark:text-white">
            À partir du {formatLocalDate(adjustment.effectiveFrom)}
          </h3>
        </div>
        <span className="rounded-full bg-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
          {adjustment.status === 'active' ? 'Actif' : 'Révoqué'}
        </span>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-3">
        <div>
          <dt className="text-[11px] text-slate-500 dark:text-slate-400">Variation</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatSigned(adjustment.adjustmentKcalPerDay, 'kcal/j')}
          </dd>
        </div>
        <div>
          <dt className="text-[11px] text-slate-500 dark:text-slate-400">Cumul résultant</dt>
          <dd className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
            {formatSigned(adjustment.resultingCumulativeAdjustmentKcal, 'kcal/j')}
          </dd>
        </div>
      </dl>
    </article>
  );
}
