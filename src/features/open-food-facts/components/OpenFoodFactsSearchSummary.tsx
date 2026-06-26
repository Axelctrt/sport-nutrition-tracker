import { Database, Globe2, SearchCheck } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface OpenFoodFactsSearchSummaryProps {
  localCount: number;
  remoteCount: number;
  totalCount?: number | undefined;
}

export function OpenFoodFactsSearchSummary({
  localCount,
  remoteCount,
  totalCount,
}: OpenFoodFactsSearchSummaryProps) {
  return (
    <Card className="p-4 sm:p-5" aria-label="Résumé de la recherche">
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="min-w-0 rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-950/60">
          <Database aria-hidden="true" className="mx-auto size-4 text-brand-700 dark:text-brand-300" />
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{localCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Local</p>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-950/60">
          <Globe2 aria-hidden="true" className="mx-auto size-4 text-orange-700 dark:text-orange-300" />
          <p className="mt-1 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{remoteCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Affichés</p>
        </div>
        <div className="min-w-0 rounded-xl bg-slate-50 px-2 py-3 dark:bg-slate-950/60">
          <SearchCheck aria-hidden="true" className="mx-auto size-4 text-emerald-700 dark:text-emerald-300" />
          <p className="mt-1 truncate text-lg font-bold tabular-nums text-slate-950 dark:text-white">
            {totalCount === undefined ? '—' : totalCount.toLocaleString('fr-FR')}
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Dans la base</p>
        </div>
      </div>
    </Card>
  );
}
