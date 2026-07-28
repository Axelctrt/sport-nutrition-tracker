import { ChevronDown, type LucideIcon } from 'lucide-react';
import {
  useCallback,
  useEffect,
  useId,
  useState,
  type PropsWithChildren,
  type ReactNode,
} from 'react';

import '@/shared/ui/uxMotionPolish.css';
import { cn } from '@/shared/utils/cn';

export interface CollapsibleSectionProps
  extends PropsWithChildren {
  title: string;
  description?: string;
  summary?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  sectionId?: string;
  storageKey?: string;
  icon?: LucideIcon;
}

function readStoredOpenState(
  storageKey: string | undefined,
  defaultOpen: boolean,
): boolean {
  if (!storageKey || typeof window === 'undefined') {
    return defaultOpen;
  }

  try {
    const stored = window.localStorage.getItem(storageKey);
    return stored === null ? defaultOpen : stored === 'open';
  } catch {
    return defaultOpen;
  }
}

function matchesHash(sectionId: string | undefined): boolean {
  if (!sectionId || typeof window === 'undefined') return false;

  return (
    decodeURIComponent(window.location.hash.slice(1)) === sectionId
  );
}

function prefersReducedMotion(): boolean {
  return (
    window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    ).matches ?? false
  );
}

function scheduleSectionScroll(
  sectionId: string,
): void {
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      document.getElementById(sectionId)?.scrollIntoView?.({
        behavior: prefersReducedMotion() ? 'auto' : 'smooth',
        block: 'center',
        inline: 'nearest',
      });
    });
  });
}

export function CollapsibleSection({
  title,
  description,
  summary,
  defaultOpen = false,
  className,
  sectionId,
  storageKey,
  icon: Icon,
  children,
}: CollapsibleSectionProps) {
  const generatedId = useId();
  const contentId = `${sectionId ?? generatedId}-content`;
  const [isOpen, setIsOpen] = useState(
    () =>
      matchesHash(sectionId) ||
      readStoredOpenState(storageKey, defaultOpen),
  );

  const persistOpenState = useCallback((nextOpen: boolean) => {
    if (!storageKey) return;
    try {
      window.localStorage.setItem(
        storageKey,
        nextOpen ? 'open' : 'closed',
      );
    } catch {
      // Le repli reste fonctionnel si le stockage est indisponible.
    }
  }, [storageKey]);

  const openFromHash = useCallback(() => {
    if (!matchesHash(sectionId) || !sectionId) return;

    setIsOpen(true);
    persistOpenState(true);
    scheduleSectionScroll(sectionId);
  }, [persistOpenState, sectionId]);

  useEffect(() => {
    openFromHash();
    window.addEventListener('hashchange', openFromHash);

    return () => {
      window.removeEventListener('hashchange', openFromHash);
    };
  }, [openFromHash]);

  const toggle = () => {
    setIsOpen((current) => {
      const nextOpen = !current;
      persistOpenState(nextOpen);
      return nextOpen;
    });
  };

  return (
    <section
      id={sectionId}
      data-open={isOpen ? 'true' : 'false'}
      className={cn(
        'sp-collapsible overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <button
        type="button"
        aria-expanded={isOpen}
        aria-controls={contentId}
        onClick={toggle}
        className="sp-collapsible-summary flex min-h-16 w-full cursor-pointer items-center gap-3 px-4 py-3 text-left sm:px-5"
      >
        {Icon ? (
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
            <Icon aria-hidden="true" className="size-5" />
          </span>
        ) : null}

        <span className="min-w-0 flex-1">
          <span className="block font-semibold text-slate-950 dark:text-white">
            {title}
          </span>
          {description ? (
            <span className="mt-0.5 block text-sm leading-5 text-slate-600 dark:text-slate-300">
              {description}
            </span>
          ) : null}
        </span>

        {summary ? (
          <span className="hidden shrink-0 text-right text-sm text-slate-500 sm:block dark:text-slate-400">
            {summary}
          </span>
        ) : null}

        <ChevronDown
          aria-hidden="true"
          className={cn(
            'size-5 shrink-0 text-slate-500 transition-transform duration-200 motion-reduce:transition-none',
            isOpen && 'rotate-180',
          )}
        />
      </button>

      <div
        id={contentId}
        role="region"
        aria-hidden={!isOpen}
        className="sp-collapsible-content"
      >
        <div>
          <div className="border-t border-slate-200 p-4 sm:p-5 dark:border-slate-800">
            {children}
          </div>
        </div>
      </div>
    </section>
  );
}
