import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useId, useRef, type ReactNode } from 'react';
import { IconAction } from '@/shared/ui/IconAction';
import { cn } from '@/shared/utils/cn';

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

interface BottomSheetProps {
  open: boolean;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  closeLabel?: string;
  dismissible?: boolean;
  className?: string;
}

export function BottomSheet({
  open,
  title,
  description,
  children,
  footer,
  onClose,
  closeLabel = 'Fermer',
  dismissible = true,
  className,
}: BottomSheetProps) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    if (dismissible) {
      closeButtonRef.current?.focus();
    } else {
      panelRef.current?.focus();
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && dismissible) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [dismissible, onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 backdrop-blur-[2px]"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && dismissible) onClose();
      }}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        tabIndex={-1}
        className={cn(
          'safe-area-bottom max-h-[min(88dvh,48rem)] w-full max-w-2xl overflow-hidden rounded-t-[var(--sp-radius-sheet)] border border-b-0 border-slate-200 bg-white shadow-[var(--sp-shadow-panel)] dark:border-slate-800 dark:bg-slate-900',
          'motion-safe:animate-[sheet-in_220ms_ease-out] motion-reduce:animate-none',
          className,
        )}
      >
        <div aria-hidden="true" className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        <div className="flex items-start gap-3 border-b border-slate-200 px-4 pb-4 pt-3 dark:border-slate-800 sm:px-5">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-lg font-semibold leading-6 text-slate-950 dark:text-white">
              {title}
            </h2>
            {description ? (
              <p id={descriptionId} className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">
                {description}
              </p>
            ) : null}
          </div>
          {dismissible ? (
            <IconAction ref={closeButtonRef} icon={X} label={closeLabel} variant="ghost" onClick={onClose} />
          ) : null}
        </div>
        <div className="max-h-[calc(min(88dvh,48rem)-8rem)] overflow-y-auto overscroll-contain px-4 py-4 sm:px-5">
          {children}
        </div>
        {footer ? (
          <div className="border-t border-slate-200 bg-white/95 px-4 py-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-5">
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
