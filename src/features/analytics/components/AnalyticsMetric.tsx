import type { LucideIcon } from 'lucide-react';
import { Card } from '@/shared/ui/Card';

interface AnalyticsMetricProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'orange' | 'cyan' | 'emerald' | 'violet' | 'slate';
}

const toneClasses = {
  orange: 'bg-orange-100 text-orange-800 dark:bg-orange-950 dark:text-orange-200',
  cyan: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-200',
  emerald: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  violet: 'bg-violet-100 text-violet-800 dark:bg-violet-950 dark:text-violet-200',
  slate: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200',
} as const;

export function AnalyticsMetric({
  label,
  value,
  detail,
  icon: Icon,
  tone = 'slate',
}: AnalyticsMetricProps) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${toneClasses[tone]}`}>
          <Icon aria-hidden="true" className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</p>
          <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{detail}</p>
        </div>
      </div>
    </Card>
  );
}
