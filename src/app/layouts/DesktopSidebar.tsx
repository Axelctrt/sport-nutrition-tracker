import { Dumbbell } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import {
  navigationItemIsActive,
  primaryNavigation,
  secondaryNavigation,
} from '@/app/navigation';
import { cn } from '@/shared/utils/cn';

function navigationClassName(isActive: boolean): string {
  return cn(
    'sp-navigation-link flex min-h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium',
    isActive && 'is-active',
  );
}

export function DesktopSidebar() {
  const location = useLocation();

  return (
    <aside className="sp-navigation-shell fixed inset-y-0 left-0 z-30 hidden w-72 overflow-hidden border-r p-4 lg:flex lg:flex-col">
      <div className="flex shrink-0 items-center gap-3 px-2 py-3">
        <span className="grid size-11 place-items-center rounded-lg bg-[var(--sp-accent-primary)] text-white shadow-sm">
          <Dumbbell aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-lg font-bold text-[var(--sp-text-primary)]">SportPilot</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sport · nutrition · progression</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="flex min-h-full flex-col">
          <nav aria-label="Navigation principale" className="mt-5 space-y-1">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = navigationItemIsActive(location.pathname, item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={navigationClassName(isActive)}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <nav
            aria-label="Navigation secondaire"
            className="mt-5 space-y-1 border-t border-[var(--sp-border-subtle)] pt-4"
          >
            {secondaryNavigation.map((item) => {
              const Icon = item.icon;
              const isActive = navigationItemIsActive(location.pathname, item);
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  aria-current={isActive ? 'page' : undefined}
                  className={navigationClassName(isActive)}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
