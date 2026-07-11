import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

interface PageTitleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  eyebrow?: ReactNode;
  action?: ReactNode;
  headingId?: string;
}

export function PageTitle({
  title,
  description,
  eyebrow,
  action,
  headingId,
  className,
  ...props
}: PageTitleProps) {
  return (
    <div className={cn('flex min-w-0 items-start justify-between gap-4', className)} {...props}>
      <div className="min-w-0">
        {eyebrow ? (
          <p className="text-xs font-bold uppercase tracking-[0.12em] text-brand-700 dark:text-brand-300">
            {eyebrow}
          </p>
        ) : null}
        <h1
          id={headingId}
          className={cn(
            'text-2xl font-bold leading-tight tracking-tight text-slate-950 dark:text-white sm:text-3xl',
            eyebrow ? 'mt-1' : false,
          )}
        >
          {title}
        </h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-base leading-6 text-slate-600 dark:text-slate-300">
            {description}
          </p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

interface SectionTitleProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  headingId?: string;
}

export function SectionTitle({
  title,
  description,
  action,
  headingId,
  className,
  ...props
}: SectionTitleProps) {
  return (
    <div className={cn('flex min-w-0 items-start justify-between gap-3', className)} {...props}>
      <div className="min-w-0">
        <h2 id={headingId} className="text-lg font-semibold leading-6 text-slate-950 dark:text-white">
          {title}
        </h2>
        {description ? (
          <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function BodyText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-base leading-6 text-slate-800 dark:text-slate-100', className)}
      {...props}
    />
  );
}

export function SecondaryText({ className, ...props }: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p
      className={cn('text-sm leading-5 text-slate-600 dark:text-slate-300', className)}
      {...props}
    />
  );
}
