import { useEffect, type PropsWithChildren } from 'react';
import { cn } from '@/shared/utils/cn';

interface StickyActionBarProps extends PropsWithChildren {
  className?: string;
  toastOffset?: string;
}

export function StickyActionBar({
  children,
  className,
  toastOffset = '5.5rem',
}: StickyActionBarProps) {
  useEffect(() => {
    const root = document.documentElement;
    const previousOffset = root.style.getPropertyValue('--mobile-sticky-action-offset');
    root.style.setProperty('--mobile-sticky-action-offset', toastOffset);

    return () => {
      if (previousOffset) {
        root.style.setProperty('--mobile-sticky-action-offset', previousOffset);
      } else {
        root.style.removeProperty('--mobile-sticky-action-offset');
      }
    };
  }, [toastOffset]);

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-30 border-y border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-8px_24px_rgb(15_23_42_/_0.08)] backdrop-blur',
        'lg:static lg:mt-5 lg:rounded-2xl lg:border lg:px-4 lg:py-3 lg:shadow-sm',
        'dark:border-slate-800 dark:bg-slate-950/95',
        className,
      )}
      role="region"
      aria-label="Actions de la page"
    >
      <div className="mx-auto max-w-xl">{children}</div>
    </div>
  );
}
