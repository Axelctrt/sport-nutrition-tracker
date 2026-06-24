interface ProgressBarProps {
  value: number;
  max: number;
  label: string;
  className?: string;
  indicatorClassName?: string;
}

export function ProgressBar({
  value,
  max,
  label,
  className,
  indicatorClassName = 'bg-brand-600',
}: ProgressBarProps) {
  const safeMax = Math.max(1, max);
  const percentage = Math.min(100, Math.max(0, (value / safeMax) * 100));

  return (
    <div className={className}>
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-medium text-slate-700 dark:text-slate-200">{label}</span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          {Math.round(percentage)} %
        </span>
      </div>
      <div
        className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800"
        role="progressbar"
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={safeMax}
        aria-valuenow={Math.min(safeMax, Math.max(0, value))}
      >
        <div
          className={`h-full rounded-full transition-[width] ${indicatorClassName}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
