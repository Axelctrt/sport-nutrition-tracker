import { cn } from '@/shared/utils/cn';

interface OnboardingProgressProps {
  currentStep: number;
  totalSteps: number;
  className?: string;
}

export function OnboardingProgress({
  currentStep,
  totalSteps,
  className,
}: OnboardingProgressProps) {
  const safeTotal = Math.max(1, totalSteps);
  const safeCurrent = Math.min(safeTotal, Math.max(1, currentStep));
  const percentage = (safeCurrent / safeTotal) * 100;

  return (
    <div className={cn('flex min-w-0 items-center gap-2', className)}>
      <span className="shrink-0 text-xs font-semibold tabular-nums text-brand-700 dark:text-brand-300">
        {safeCurrent}/{safeTotal}
      </span>
      <div
        className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label="Progression de la configuration"
        aria-valuemin={1}
        aria-valuemax={safeTotal}
        aria-valuenow={safeCurrent}
      >
        <div
          className="h-full rounded-full bg-brand-600 transition-[width] motion-reduce:transition-none"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
