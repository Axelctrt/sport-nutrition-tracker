import { CircleAlert, CircleCheck, Info } from 'lucide-react';
import type { HTMLAttributes } from 'react';
import { cn } from '@/shared/utils/cn';

type NoticeTone = 'info' | 'success' | 'error';

interface InlineNoticeProps extends HTMLAttributes<HTMLDivElement> {
  tone?: NoticeTone;
  title: string;
}

const toneClasses: Record<NoticeTone, string> = {
  info: 'border-sky-200 bg-sky-50 text-sky-950 dark:border-sky-900 dark:bg-sky-950/40 dark:text-sky-100',
  success: 'border-emerald-200 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
  error: 'border-red-200 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
};

const icons = {
  info: Info,
  success: CircleCheck,
  error: CircleAlert,
} as const;

export function InlineNotice({
  tone = 'info',
  title,
  className,
  children,
  ...props
}: InlineNoticeProps) {
  const Icon = icons[tone];

  return (
    <div
      className={cn('rounded-xl border p-4', toneClasses[tone], className)}
      {...props}
    >
      <div className="flex items-start gap-3">
        <Icon aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
        <div>
          <p className="font-semibold">{title}</p>
          {children ? <div className="mt-1 text-sm leading-6 opacity-90">{children}</div> : null}
        </div>
      </div>
    </div>
  );
}
