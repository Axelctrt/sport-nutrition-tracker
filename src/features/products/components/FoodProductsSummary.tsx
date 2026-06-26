import { Database, ShieldAlert, Star, Utensils } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface FoodProductsSummaryProps {
  totalCount: number;
  favoriteCount: number;
  openFoodFactsCount: number;
  incompleteCount: number;
}

interface MetricProps {
  icon: typeof Utensils;
  label: string;
  value: number;
}

function Metric({ icon: Icon, label, value }: MetricProps) {
  return (
    <div
      className="min-w-0 rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70"
      aria-label={`${label} : ${value}`}
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span className="truncate">{label}</span>
      </div>
      <p className="mt-1 text-xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
    </div>
  );
}

export function FoodProductsSummary({
  totalCount,
  favoriteCount,
  openFoodFactsCount,
  incompleteCount,
}: FoodProductsSummaryProps) {
  return (
    <Card className="mt-5 p-4 sm:p-5" aria-label="Résumé des aliments locaux">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Bibliothèque locale</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Disponible hors connexion sur cet appareil.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
          {totalCount} aliment{totalCount > 1 ? 's' : ''}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        <Metric icon={Utensils} label="Actifs" value={totalCount} />
        <Metric icon={Star} label="Favoris" value={favoriteCount} />
        <Metric icon={Database} label="Open Food Facts" value={openFoodFactsCount} />
        <Metric icon={ShieldAlert} label="À vérifier" value={incompleteCount} />
      </div>
    </Card>
  );
}
