import type { LucideIcon } from 'lucide-react';
import { useId, type PropsWithChildren, type ReactNode } from 'react';
import { cn } from '@/shared/utils/cn';

export interface ChoiceCardProps {
  name: string;
  value: string;
  title: ReactNode;
  description?: ReactNode;
  icon?: LucideIcon;
  selected: boolean;
  badge?: ReactNode;
  disabled?: boolean;
  className?: string;
  onSelect: (value: string) => void;
  compact?: boolean;
  comfortable?: boolean;
  dense?: boolean;
  tight?: boolean;
}

export function ChoiceCard({
  name,
  value,
  title,
  description,
  icon: Icon,
  selected,
  badge,
  disabled,
  className,
  onSelect,
  compact,
  comfortable,
  dense,
  tight,
}: ChoiceCardProps) {
  const titleId = useId();
  const descriptionId = `${titleId}-description`;
  const small = tight || dense || comfortable || compact;
  const spacing = tight
    ? 'min-h-11 gap-2 px-3 py-1.5'
    : dense
      ? 'min-h-14 gap-2 px-3 py-2'
      : comfortable
        ? 'min-h-20 gap-3 p-3'
        : compact
          ? 'min-h-16 gap-2 p-2.5'
          : 'min-h-24 gap-4 p-4';
  const iconBox = tight
    ? 'size-8'
    : dense
      ? 'size-9'
      : comfortable
        ? 'size-10'
        : compact
          ? 'size-9'
          : 'size-11';

  return (
    <label className={cn('block', disabled ? 'cursor-not-allowed' : 'cursor-pointer', className)}>
      <input
        type="radio"
        name={name}
        value={value}
        checked={selected}
        disabled={disabled}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onClick={() => {
          if (selected) onSelect(value);
        }}
        onChange={() => onSelect(value)}
        className="peer sr-only"
      />
      <span
        className={cn(
          'relative grid w-full items-start rounded-[var(--sp-radius-card)] border text-left transition-[border-color,background-color,box-shadow,transform]',
          Icon
            ? 'grid-cols-[auto_minmax(0,1fr)_1.25rem]'
            : 'grid-cols-[minmax(0,1fr)_1.25rem]',
          spacing,
          'peer-focus-visible:outline peer-focus-visible:outline-[3px] peer-focus-visible:outline-offset-2 peer-focus-visible:outline-brand-500/60',
          'peer-disabled:opacity-60',
          selected
            ? 'border-brand-600 bg-brand-50/80 shadow-[0_0_0_1px_rgb(13_148_136_/_0.22)] dark:border-brand-400 dark:bg-brand-950/35'
            : 'border-slate-200 bg-white hover:border-brand-300 hover:bg-slate-50 active:translate-y-px dark:border-slate-800 dark:bg-slate-900 dark:hover:border-brand-700 dark:hover:bg-slate-800/80',
        )}
      >
        {Icon ? (
          <span
            className={cn(
              'grid shrink-0 place-items-center rounded-xl',
              iconBox,
              selected
                ? 'bg-brand-700 text-white dark:bg-brand-500'
                : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
            )}
          >
            <Icon aria-hidden="true" className={small ? 'size-4' : 'size-5'} />
          </span>
        ) : null}
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span
              id={titleId}
              className={cn(
                'min-w-0 font-semibold text-slate-950 dark:text-white',
                small && 'text-sm leading-5',
              )}
            >
              {title}
            </span>
            {badge ? (
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {badge}
              </span>
            ) : null}
          </span>
          {description ? (
            <span
              id={descriptionId}
              className={cn(
                'mt-1 block text-sm leading-5 text-slate-600 dark:text-slate-300',
                small && 'text-xs leading-4',
              )}
            >
              {description}
            </span>
          ) : null}
        </span>
        <span
          aria-hidden="true"
          className={cn(
            'mt-1 size-5 shrink-0 rounded-full border-2 p-0.5',
            selected ? 'border-brand-700 dark:border-brand-400' : 'border-slate-300 dark:border-slate-600',
          )}
        >
          <span className={cn('block size-full rounded-full', selected && 'bg-brand-700 dark:bg-brand-400')} />
        </span>
      </span>
    </label>
  );
}

interface ChoiceCardGroupProps extends PropsWithChildren {
  label: ReactNode;
  description?: ReactNode;
  className?: string;
  columns?: 1 | 2 | 3;
}

const columnClasses = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
} as const;

export function ChoiceCardGroup({
  label,
  description,
  className,
  columns = 2,
  children,
}: ChoiceCardGroupProps) {
  return (
    <fieldset className={className}>
      <legend className="text-sm font-semibold text-slate-800 dark:text-slate-100">{label}</legend>
      {description ? (
        <p className="mt-1 text-sm leading-5 text-slate-600 dark:text-slate-300">{description}</p>
      ) : null}
      <div className={cn('mt-3 grid gap-3', columnClasses[columns])}>{children}</div>
    </fieldset>
  );
}
