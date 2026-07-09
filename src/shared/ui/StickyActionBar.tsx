import { useEffect, type CSSProperties, type PropsWithChildren } from 'react';
import { cn } from '@/shared/utils/cn';

interface StickyActionBarProps extends PropsWithChildren {
  className?: string;
  contentClassName?: string;
  toastOffset?: string;
  mobileBottomOffset?: string;
  ariaLabel?: string;
}

export function StickyActionBar({
  children,
  className,
  contentClassName,
  toastOffset = '5.5rem',
  mobileBottomOffset = '4.5rem',
  ariaLabel = 'Actions de la page',
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

  const style = {
    '--sp-sticky-action-bottom': mobileBottomOffset,
  } as CSSProperties;

  return (
    <div
      className={cn(
        'fixed inset-x-0 bottom-[calc(var(--sp-sticky-action-bottom)+env(safe-area-inset-bottom))] z-30 border-y border-slate-200 bg-white/95 px-3 py-2.5 shadow-[0_-8px_24px_rgb(15_23_42_/_0.08)] backdrop-blur',
        'lg:static lg:mt-5 lg:rounded-[var(--sp-radius-card)] lg:border lg:px-4 lg:py-3 lg:shadow-sm',
        'dark:border-slate-800 dark:bg-slate-950/95',
        className,
      )}
      style={style}
      role="region"
      aria-label={ariaLabel}
    >
      <div className={cn('mx-auto max-w-xl', contentClassName)}>{children}</div>
    </div>
  );
}
