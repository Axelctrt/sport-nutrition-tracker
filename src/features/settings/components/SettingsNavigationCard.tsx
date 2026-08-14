import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

import { Card } from '@/shared/ui/Card';

interface SettingsNavigationCardProps {
  to: string;
  title: string;
  description: string;
  icon: LucideIcon;
  value?: string;
  actionRequired?: boolean;
  showArrow?: boolean;
}

export function SettingsNavigationCard({
  to,
  title,
  description,
  icon: Icon,
  value,
  actionRequired = false,
  showArrow = true,
}: SettingsNavigationCardProps) {
  return (
    <Link
      to={to}
      className="group block min-w-0 rounded-[var(--sp-radius-card)]"
    >
      <Card variant="interactive" padding="md" className="h-full">
        <div className="flex items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-[var(--sp-radius-control)] bg-[var(--sp-surface-muted)] text-[var(--sp-accent-primary)]">
            <Icon aria-hidden="true" className="size-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-start justify-between gap-2">
              <span className="font-bold text-[var(--sp-text-primary)]">
                {title}
              </span>
              <span className="flex shrink-0 items-center gap-2">
                {actionRequired ? (
                  <span className="rounded-full border px-2 py-1 text-[0.65rem] font-bold uppercase tracking-wide text-[var(--sp-warning)] [border-color:var(--sp-warning)]">
                    Action requise
                  </span>
                ) : null}
                {showArrow ? (
                  <ArrowRight
                    aria-hidden="true"
                    className="size-4 text-[var(--sp-text-muted)] transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none"
                  />
                ) : null}
              </span>
            </span>
            <span className="mt-1 block text-sm leading-6 text-[var(--sp-text-secondary)]">
              {description}
            </span>
            {value ? (
              <span className="mt-3 block text-sm font-semibold text-[var(--sp-accent-primary)]">
                {value}
              </span>
            ) : null}
          </span>
        </div>
      </Card>
    </Link>
  );
}
