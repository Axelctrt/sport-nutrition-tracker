import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';

interface ChartCardProps {
  title: string;
  description: string;
  children: ReactNode;
  empty?: boolean;
  emptyMessage?: string;
}

export function ChartCard({
  title,
  description,
  children,
  empty = false,
  emptyMessage = 'Aucune donnée disponible sur cette période.',
}: ChartCardProps) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-slate-200 p-5 dark:border-slate-800">
        <h2 className="text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{description}</p>
      </div>
      <div className="p-4 sm:p-5">
        {empty ? (
          <div className="grid min-h-72 place-items-center rounded-xl border border-dashed border-slate-300 bg-slate-50 px-6 text-center text-sm text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            {emptyMessage}
          </div>
        ) : children}
      </div>
    </Card>
  );
}
