import { ChevronRight, CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import type { CSSProperties } from 'react';
import type { ToastItem } from '@/shared/toast/ToastContext';
import '@/shared/toast/toast.css';
import { cn } from '@/shared/utils/cn';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
  onAction: (toast: ToastItem) => void;
}

const accentClasses = {
  success: 'bg-emerald-500 text-white shadow-emerald-500/25',
  error: 'bg-rose-600 text-white shadow-rose-600/25',
  info: 'bg-sky-600 text-white shadow-sky-600/25',
} as const;

const borderClasses = {
  success: 'before:bg-emerald-500',
  error: 'before:bg-rose-600',
  info: 'before:bg-sky-600',
} as const;

const icons = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

export function ToastViewport({ toasts, onDismiss, onAction }: ToastViewportProps) {
  return (
    <div
      className="toast-viewport-offset pointer-events-none fixed inset-x-3 z-[70] flex flex-col items-center gap-2 lg:inset-x-auto lg:right-6 lg:w-[24rem]"
      aria-label="Notifications"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        const actionable = Boolean(toast.action || toast.destination);
        const content = (
          <>
            <span
              className={cn(
                'mt-0.5 grid size-10 shrink-0 place-items-center rounded-2xl shadow-lg',
                accentClasses[toast.tone],
              )}
            >
              <Icon aria-hidden="true" className="size-5" />
            </span>
            <span className="min-w-0 flex-1 text-left">
              <span className="block font-semibold text-slate-950 dark:text-white">
                {toast.title}
              </span>
              {toast.description ? (
                <span className="mt-1 line-clamp-2 block text-sm leading-5 text-slate-600 dark:text-slate-300">
                  {toast.description}
                </span>
              ) : null}
              {toast.action && !toast.destination ? (
                <span className="mt-2 block text-sm font-semibold text-brand-700 dark:text-brand-300">
                  {toast.action.label}
                </span>
              ) : null}
            </span>
            {actionable ? (
              <ChevronRight aria-hidden="true" className="mt-2 size-5 shrink-0 text-slate-400" />
            ) : null}
          </>
        );

        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto relative w-full max-w-md overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/92 p-3.5 shadow-[0_18px_55px_-24px_rgba(15,23,42,0.55)] backdrop-blur-xl',
              'before:absolute before:inset-y-0 before:left-0 before:w-1',
              'dark:border-slate-700/80 dark:bg-slate-900/92',
              'motion-safe:animate-[toast-in_220ms_cubic-bezier(0.2,0.8,0.2,1)] motion-reduce:animate-none',
              borderClasses[toast.tone],
            )}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <div className="flex items-start gap-3">
              {actionable ? (
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-start gap-3 rounded-xl text-left outline-none transition active:scale-[0.99] focus-visible:ring-2 focus-visible:ring-brand-500 motion-reduce:transition-none"
                  onClick={() => onAction(toast)}
                  aria-label={
                    toast.action?.ariaLabel
                    ?? toast.destination?.label
                    ?? `${toast.title} : ouvrir`
                  }
                >
                  {content}
                </button>
              ) : (
                <div className="flex min-w-0 flex-1 items-start gap-3">{content}</div>
              )}
              <button
                type="button"
                className="-mr-1 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xl text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                onClick={() => onDismiss(toast.id)}
                aria-label={`Fermer la notification : ${toast.title}`}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
            {toast.durationMs !== null ? (
              <span
                aria-hidden="true"
                className="absolute inset-x-0 bottom-0 h-0.5 origin-left bg-current opacity-20 motion-safe:animate-[toast-progress_var(--toast-duration)_linear_forwards] motion-reduce:hidden"
                style={{ '--toast-duration': `${toast.durationMs}ms` } as CSSProperties}
              />
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
