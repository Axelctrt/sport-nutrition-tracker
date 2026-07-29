import { ChevronDown, HelpCircle } from 'lucide-react';
import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils/cn';

interface ContextHelpProps {
  question?: ReactNode;
  children: ReactNode;
  tone?: 'neutral' | 'brand';
  iconOnly?: boolean;
  className?: string | undefined;
}

interface PopoverPosition {
  top: number;
  left: number;
  arrowLeft: number;
  placement: 'above' | 'below';
}

const OPEN_EVENT = 'sportpilot:context-help-open';
const VIEWPORT_MARGIN = 12;
const POPOVER_GAP = 8;

export function ContextHelp({
  question = 'Pourquoi cette information ?',
  children,
  tone = 'neutral',
  iconOnly = false,
  className,
}: ContextHelpProps) {
  const instanceId = useId();
  const popoverId = `${instanceId}-popover`;
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [position, setPosition] = useState<PopoverPosition>({
    top: 0,
    left: VIEWPORT_MARGIN,
    arrowLeft: 24,
    placement: 'below',
  });

  function close({ restoreFocus = false } = {}) {
    setIsOpen(false);
    if (restoreFocus) triggerRef.current?.focus();
  }

  function toggle() {
    if (isOpen) {
      close();
      return;
    }
    window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: instanceId }));
    setIsOpen(true);
  }

  useEffect(() => {
    const closeOtherHelp = (event: Event) => {
      if ((event as CustomEvent<string>).detail !== instanceId) close();
    };
    window.addEventListener(OPEN_EVENT, closeOtherHelp);
    return () => window.removeEventListener(OPEN_EVENT, closeOtherHelp);
  }, [instanceId]);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        !triggerRef.current?.contains(target)
        && !popoverRef.current?.contains(target)
      ) {
        close();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') close({ restoreFocus: true });
    };

    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  useLayoutEffect(() => {
    if (!isOpen) return;

    const updatePosition = () => {
      const trigger = triggerRef.current;
      const popover = popoverRef.current;
      if (!trigger || !popover) return;

      const triggerRect = trigger.getBoundingClientRect();
      const popoverRect = popover.getBoundingClientRect();
      const belowTop = triggerRect.bottom + POPOVER_GAP;
      const aboveTop = triggerRect.top - POPOVER_GAP - popoverRect.height;
      const fitsBelow = belowTop + popoverRect.height <= window.innerHeight - VIEWPORT_MARGIN;
      const placement = fitsBelow || aboveTop < VIEWPORT_MARGIN ? 'below' : 'above';
      const unclampedTop = placement === 'below' ? belowTop : aboveTop;
      const top = Math.min(
        Math.max(VIEWPORT_MARGIN, unclampedTop),
        Math.max(VIEWPORT_MARGIN, window.innerHeight - popoverRect.height - VIEWPORT_MARGIN),
      );
      const centeredLeft = triggerRect.left + (triggerRect.width / 2) - (popoverRect.width / 2);
      const left = Math.min(
        Math.max(VIEWPORT_MARGIN, centeredLeft),
        Math.max(VIEWPORT_MARGIN, window.innerWidth - popoverRect.width - VIEWPORT_MARGIN),
      );
      const arrowLeft = Math.min(
        Math.max(16, triggerRect.left + (triggerRect.width / 2) - left),
        Math.max(16, popoverRect.width - 16),
      );

      setPosition({ top, left, arrowLeft, placement });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen]);

  return (
    <span
      className={cn(
        iconOnly ? 'inline-flex' : 'block',
        className,
      )}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popoverId : undefined}
        aria-label={iconOnly && typeof question === 'string' ? question : undefined}
        title={iconOnly && typeof question === 'string' ? question : undefined}
        onClick={toggle}
        className={cn(
          'flex min-h-[var(--sp-touch-target)] items-center gap-2 text-sm font-semibold text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-600 dark:text-slate-200',
          iconOnly
            ? 'size-[var(--sp-touch-target)] justify-center rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800'
            : 'w-full rounded-[var(--sp-radius-control)] border px-3 py-2 text-left',
          !iconOnly && tone === 'brand'
            ? 'border-brand-200 bg-brand-50/70 dark:border-brand-900 dark:bg-brand-950/30'
            : !iconOnly && 'border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/60',
        )}
      >
        <HelpCircle aria-hidden="true" className="size-4 shrink-0" />
        <span className={iconOnly ? 'sr-only' : 'min-w-0 flex-1'}>{question}</span>
        {iconOnly ? null : (
          <ChevronDown
            aria-hidden="true"
            className={cn('size-4 shrink-0 transition-transform', isOpen && 'rotate-180')}
          />
        )}
      </button>

      {isOpen && typeof document !== 'undefined'
        ? createPortal(
            <div
              ref={popoverRef}
              id={popoverId}
              role="dialog"
              aria-label={typeof question === 'string' ? question : 'Aide contextuelle'}
              className="fixed z-[80] w-80 max-w-[calc(100vw-1.5rem)] rounded-lg border border-slate-200 bg-white px-3 py-3 text-sm leading-6 text-slate-600 shadow-xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
              style={{ top: position.top, left: position.left }}
            >
              <span
                aria-hidden="true"
                className={cn(
                  'absolute size-3 rotate-45 border bg-white dark:bg-slate-900',
                  position.placement === 'below'
                    ? '-top-1.5 border-b-0 border-r-0 border-slate-200 dark:border-slate-700'
                    : '-bottom-1.5 border-l-0 border-t-0 border-slate-200 dark:border-slate-700',
                )}
                style={{ left: position.arrowLeft - 6 }}
              />
              {children}
            </div>,
            document.body,
          )
        : null}
    </span>
  );
}
