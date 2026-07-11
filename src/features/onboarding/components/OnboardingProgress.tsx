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
    <div className={cn('min-w-0', className)}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-semibold text-brand-700 dark:text-brand-300">
          Étape {safeCurrent} sur {safeTotal}
        </span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {Math.round(percentage)} %
        </span>
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
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
