import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import type { ToastItem } from '@/shared/toast/ToastContext';
import { cn } from '@/shared/utils/cn';

interface ToastViewportProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

const toneClasses = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950 dark:text-red-100',
  info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950 dark:text-sky-100',
} as const;

const icons = {
  success: CircleCheck,
  error: CircleAlert,
  info: Info,
} as const;

export function ToastViewport({ toasts, onDismiss }: ToastViewportProps) {
  return (
    <div
      className="toast-viewport-offset pointer-events-none fixed inset-x-3 z-[70] flex flex-col items-center gap-2 lg:inset-x-auto lg:right-6 lg:w-[24rem]"
      aria-label="Notifications"
      aria-live="polite"
      aria-relevant="additions text"
    >
      {toasts.map((toast) => {
        const Icon = icons[toast.tone];
        return (
          <div
            key={toast.id}
            className={cn(
              'pointer-events-auto w-full max-w-md rounded-2xl border p-4 shadow-xl shadow-slate-950/10',
              'motion-safe:animate-[toast-in_180ms_ease-out] motion-reduce:animate-none',
              toneClasses[toast.tone],
            )}
            role={toast.tone === 'error' ? 'alert' : 'status'}
          >
            <div className="flex items-start gap-3">
              <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{toast.title}</p>
                {toast.description ? (
                  <p className="mt-1 text-sm leading-5 opacity-90">{toast.description}</p>
                ) : null}
              </div>
              <button
                type="button"
                className="-mr-1 -mt-1 inline-flex size-10 shrink-0 items-center justify-center rounded-xl opacity-70 transition-opacity hover:opacity-100"
                onClick={() => onDismiss(toast.id)}
                aria-label={`Fermer la notification : ${toast.title}`}
              >
                <X aria-hidden="true" className="size-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
