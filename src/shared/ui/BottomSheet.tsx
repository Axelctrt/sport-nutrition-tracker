import { X } from 'lucide-react';
import { createPortal } from 'react-dom';
import {
  useEffect,
  useId,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
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

const DISMISS_DISTANCE_PX = 110;
const DISMISS_VELOCITY_PX_PER_MS = 0.65;
const MINIMUM_VELOCITY_DISMISS_DISTANCE_PX = 24;

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
  const backdropRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<{
    pointerId: number;
    startY: number;
    startedAt: number;
  } | undefined>(undefined);
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (!open) return undefined;
    const viewport = window.visualViewport;
    const backdrop = backdropRef.current;
    if (!viewport || !backdrop) return undefined;

    const syncViewport = () => {
      backdrop.style.height = `${viewport.height}px`;
      backdrop.style.top = `${viewport.offsetTop}px`;
    };

    syncViewport();
    viewport.addEventListener('resize', syncViewport);
    viewport.addEventListener('scroll', syncViewport);
    return () => {
      viewport.removeEventListener('resize', syncViewport);
      viewport.removeEventListener('scroll', syncViewport);
    };
  }, [open]);

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

  useEffect(() => {
    if (open) {
      setDragOffset(0);
      setIsDragging(false);
      dragRef.current = undefined;
    }
  }, [open]);

  const resetDrag = () => {
    dragRef.current = undefined;
    setIsDragging(false);
    setDragOffset(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dismissible || !event.isPrimary || event.button > 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startY: event.clientY,
      startedAt: event.timeStamp,
    };
    setIsDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    setDragOffset(Math.max(0, event.clientY - drag.startY));
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;

    const distance = Math.max(0, event.clientY - drag.startY);
    const elapsed = Math.max(1, event.timeStamp - drag.startedAt);
    const velocity = distance / elapsed;
    const shouldDismiss = distance >= DISMISS_DISTANCE_PX
      || (
        distance >= MINIMUM_VELOCITY_DISMISS_DISTANCE_PX
        && velocity >= DISMISS_VELOCITY_PX_PER_MS
      );

    dragRef.current = undefined;
    setIsDragging(false);
    if (shouldDismiss) {
      onClose();
    } else {
      setDragOffset(0);
    }
  };

  if (!open) return null;

  return createPortal(
    <div
      ref={backdropRef}
      className="fixed inset-x-0 top-0 z-[80] flex h-dvh items-end justify-center overflow-hidden bg-slate-950/55 backdrop-blur-[2px]"
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
        style={{ transform: `translateY(${dragOffset}px)` }}
        className={cn(
          'flex max-h-[min(100%,48rem)] w-full max-w-2xl flex-col overflow-hidden rounded-t-[var(--sp-radius-sheet)] border border-b-0 border-slate-200 bg-white shadow-[var(--sp-shadow-panel)] dark:border-slate-800 dark:bg-slate-900',
          'motion-safe:animate-[sheet-in_220ms_ease-out] motion-reduce:animate-none',
          isDragging
            ? 'transition-none'
            : 'transition-transform duration-200 ease-out motion-reduce:transition-none',
          className,
        )}
      >
        <div
          aria-hidden="true"
          data-bottom-sheet-drag-handle
          className={cn(
            'flex h-11 shrink-0 items-center justify-center touch-none select-none',
            dismissible ? 'cursor-grab active:cursor-grabbing' : 'cursor-default',
          )}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerEnd}
          onPointerCancel={resetDrag}
        >
          <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-slate-700" />
        </div>
        <div className="flex shrink-0 items-start gap-3 border-b border-slate-200 px-4 pb-4 dark:border-slate-800 sm:px-5">
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
        <div
          data-bottom-sheet-content
          className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-4 py-4 sm:px-5"
        >
          {children}
        </div>
        {footer ? (
          <div
            data-bottom-sheet-footer
            className="shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur dark:border-slate-800 dark:bg-slate-900/95 sm:px-5"
          >
            {footer}
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
