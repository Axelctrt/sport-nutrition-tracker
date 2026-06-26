import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import { useEffect, useRef, type ReactNode } from 'react';
import { Button } from '@/shared/ui/Button';

interface DashboardQuickEntryDialogProps {
  open: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onClose: () => void;
}

const FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export function DashboardQuickEntryDialog({
  open,
  title,
  description,
  children,
  onClose,
}: DashboardQuickEntryDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return undefined;

    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusFrame = window.requestAnimationFrame(() => {
      const firstInput = dialogRef.current?.querySelector<HTMLElement>(
        'input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled])',
      );
      firstInput?.focus();
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }

      if (event.key !== 'Tab') return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR) ?? [],
      );
      if (focusable.length === 0) return;

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
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus();
    };
  }, [onClose, open]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] grid place-items-end bg-slate-950/55 p-3 backdrop-blur-[2px] sm:place-items-center sm:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dashboard-quick-entry-title"
        aria-describedby="dashboard-quick-entry-description"
        className="safe-area-bottom max-h-[calc(100dvh-1.5rem)] w-full max-w-lg overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-900 sm:p-6"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="dashboard-quick-entry-title" className="text-xl font-semibold text-slate-950 dark:text-white">
              {title}
            </h2>
            <p id="dashboard-quick-entry-description" className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">
              {description}
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="-mr-2 -mt-2 shrink-0 px-2"
            aria-label="Fermer"
            onClick={onClose}
          >
            <X aria-hidden="true" className="size-5" />
          </Button>
        </div>

        <div className="mt-5">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
