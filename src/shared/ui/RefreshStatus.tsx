import { LoaderCircle } from 'lucide-react';

import { cn } from '@/shared/utils/cn';

interface RefreshStatusProps {
  visible: boolean;
  label?: string;
  className?: string;
}

export function RefreshStatus({
  visible,
  label = 'Actualisation en cours…',
  className,
}: RefreshStatusProps) {
  if (!visible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'inline-flex min-h-9 items-center gap-2 rounded-full border border-slate-200 bg-white/90 px-3 text-sm font-semibold text-slate-600 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/90 dark:text-slate-300',
        className,
      )}
    >
      <LoaderCircle
        aria-hidden="true"
        className="size-4 motion-safe:animate-spin motion-reduce:animate-none"
      />
      {label}
    </div>
  );
}
