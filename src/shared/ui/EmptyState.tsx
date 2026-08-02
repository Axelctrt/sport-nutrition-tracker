import type { LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Card } from '@/shared/ui/Card';
import { cn } from '@/shared/utils/cn';

export type EmptyStateTone = 'brand' | 'neutral' | 'success';
export type EmptyStateVariant = 'first-use' | 'filtered' | 'completed' | 'unavailable';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  primaryAction?: ReactNode;
  secondaryAction?: ReactNode;
  className?: string;
  tone?: EmptyStateTone;
  compact?: boolean;
  variant?: EmptyStateVariant;
}

const toneClasses: Record<EmptyStateTone, string> = {
  brand: 'bg-brand-50 text-brand-700 dark:bg-brand-950/60 dark:text-brand-300',
  neutral: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
  success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
};

const variantDefaults: Record<EmptyStateVariant, { compact: boolean; tone: EmptyStateTone }> = {
  'first-use': { compact: false, tone: 'brand' },
  filtered: { compact: true, tone: 'neutral' },
  completed: { compact: true, tone: 'success' },
  unavailable: { compact: true, tone: 'neutral' },
};

export function EmptyState({
  icon: Icon,
  title,
  description,
  primaryAction,
  secondaryAction,
  className,
  tone,
  compact,
  variant = 'first-use',
}: EmptyStateProps) {
  const defaults = variantDefaults[variant];
  const resolvedTone = tone ?? defaults.tone;
  const resolvedCompact = compact ?? defaults.compact;

  return (
    <Card
      data-empty-state-variant={variant}
      className={cn(
        resolvedCompact ? 'px-4 py-5' : 'px-5 py-8 sm:px-8',
        'text-center',
        className,
      )}
    >
      <div className={cn('mx-auto grid size-12 place-items-center rounded-2xl', toneClasses[resolvedTone])}>
        <Icon aria-hidden="true" className="size-6" />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-slate-950 dark:text-white">{title}</h2>
      {description ? (
        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600 dark:text-slate-300">
          {description}
        </p>
      ) : null}
      {primaryAction || secondaryAction ? (
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          {primaryAction}
          {secondaryAction}
        </div>
      ) : null}
    </Card>
  );
}
