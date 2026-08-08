import { ChevronRight, type LucideIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';

import { Card } from '@/shared/ui/Card';

export type SportNavigationTone =
  | 'accent'
  | 'secondary'
  | 'success'
  | 'warning'
  | 'progress'
  | 'intense';

interface SportNavigationCardContentProps {
  title: string;
  description?: string;
  icon: LucideIcon;
  trailing?: ReactNode;
  tone?: SportNavigationTone;
}

interface SportNavigationCardBaseProps extends SportNavigationCardContentProps {
  compact?: boolean;
}

type SportNavigationCardProps = SportNavigationCardBaseProps & (
  | {
      to: string;
      state?: LinkProps['state'];
      onClick?: () => void;
    }
  | {
      to?: never;
      state?: never;
      onClick: () => void;
    }
);

const toneClasses: Record<SportNavigationTone, string> = {
  accent: 'text-[var(--sp-accent-primary)]',
  secondary: 'text-[var(--sp-accent-secondary)]',
  success: 'text-[var(--sp-success)]',
  warning: 'text-[var(--sp-warning)]',
  progress: 'text-[var(--sp-progress)]',
  intense: 'text-[var(--sp-accent-intense)]',
};

function SportNavigationCardContent({
  title,
  description,
  icon: Icon,
  trailing,
  tone = 'accent',
}: SportNavigationCardContentProps) {
  return (
    <>
      <span
        className={`grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] ${toneClasses[tone]}`}
      >
        <Icon aria-hidden="true" className="size-5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold text-[var(--sp-text-primary)]">{title}</span>
        {description ? (
          <span className="mt-0.5 block text-sm leading-5 text-[var(--sp-text-secondary)]">
            {description}
          </span>
        ) : null}
      </span>
      {trailing ?? (
        <ChevronRight
          aria-hidden="true"
          className="size-4 shrink-0 text-[var(--sp-text-muted)] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
        />
      )}
    </>
  );
}

export function SportNavigationCard({
  title,
  description,
  icon,
  trailing,
  tone,
  compact = false,
  ...destination
}: SportNavigationCardProps) {
  const contentProps: SportNavigationCardContentProps = {
    title,
    icon,
    ...(description === undefined ? {} : { description }),
    ...(trailing === undefined ? {} : { trailing }),
    ...(tone === undefined ? {} : { tone }),
  };
  const interactionClassName = compact
    ? 'group flex min-h-16 w-full items-center gap-3 px-3 py-2 text-left'
    : 'group flex min-h-20 w-full items-center gap-3 p-3 text-left';

  return (
    <Card variant="interactive" className="h-full overflow-hidden">
      {'to' in destination && destination.to ? (
        <Link
          to={destination.to}
          className={interactionClassName}
          {...(destination.state === undefined ? {} : { state: destination.state })}
          {...(destination.onClick === undefined ? {} : { onClick: destination.onClick })}
        >
          <SportNavigationCardContent {...contentProps} />
        </Link>
      ) : (
        <button
          type="button"
          onClick={destination.onClick}
          className={interactionClassName}
        >
          <SportNavigationCardContent {...contentProps} />
        </button>
      )}
    </Card>
  );
}
