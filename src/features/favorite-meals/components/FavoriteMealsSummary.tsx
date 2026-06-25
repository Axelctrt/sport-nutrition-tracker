import { Flame, Layers3, Star } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface FavoriteMealsSummaryProps {
  favoriteCount: number;
  itemCount: number;
  averageCalories: number;
}

export function FavoriteMealsSummary({ favoriteCount, itemCount, averageCalories }: FavoriteMealsSummaryProps) {
  return (
    <Card className="mt-5 p-4 sm:p-5" aria-label="Résumé des repas favoris">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950 dark:text-white">Repas réutilisables</p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Ajoute un repas complet au journal en une seule opération.</p>
        </div>
        <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-800 dark:bg-brand-950/60 dark:text-brand-200">
          {favoriteCount} favori{favoriteCount > 1 ? 's' : ''}
        </span>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70">
          <Star aria-hidden="true" className="size-4 text-slate-500" />
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{favoriteCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Favoris</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70">
          <Layers3 aria-hidden="true" className="size-4 text-slate-500" />
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{itemCount}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Éléments</p>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-3 dark:bg-slate-950/70">
          <Flame aria-hidden="true" className="size-4 text-slate-500" />
          <p className="mt-2 text-lg font-bold tabular-nums text-slate-950 dark:text-white">{Math.round(averageCalories)}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">kcal moy.</p>
        </div>
      </div>
    </Card>
  );
}
