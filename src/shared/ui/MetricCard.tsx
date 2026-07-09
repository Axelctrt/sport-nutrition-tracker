import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card, type CardProps } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';

export type MetricCardTone = 'neutral' | 'brand' | 'success' | 'warning' | 'danger';

interface MetricCardProps extends Omit<CardProps, 'children'> {
  label: ReactNode;
  value: ReactNode;
  unit?: ReactNode;
  supportingText?: ReactNode;
  icon?: LucideIcon;
  action?: ReactNode;
  tone?: MetricCardTone;
  emphasis?: 'default' | 'strong';
}

const toneClasses: Record<MetricCardTone, string> = {
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300',
  warning: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  danger: 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300',
};

export function MetricCard({
  label,
  value,
  unit,
  supportingText,
  icon: Icon,
  action,
  tone = 'neutral',
  emphasis = 'default',
  className,
  ...props
}: MetricCardProps) {
  return (
    <Card padding="md" className={cn('min-w-0', className)} {...props}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-slate-600 dark:text-slate-300">{label}</p>
          <p
            className={cn(
              'mt-2 flex min-w-0 flex-wrap items-baseline gap-1 font-bold tracking-tight text-slate-950 dark:text-white',
              emphasis === 'strong' ? 'text-3xl sm:text-4xl' : 'text-2xl sm:text-3xl',
            )}
          >
            <span>{value}</span>
            {unit ? <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">{unit}</span> : null}
          </p>
          {supportingText ? (
            <p className="mt-2 text-sm leading-5 text-slate-600 dark:text-slate-300">{supportingText}</p>
          ) : null}
        </div>
        {action ?? (Icon ? (
          <span className={cn('grid size-10 shrink-0 place-items-center rounded-xl', toneClasses[tone])}>
            <Icon aria-hidden="true" className="size-5" />
          </span>
        ) : null)}
      </div>
    </Card>
  );
}
