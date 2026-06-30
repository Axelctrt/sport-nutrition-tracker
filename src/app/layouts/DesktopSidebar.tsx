import { Dumbbell } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { primaryNavigation, secondaryNavigation } from '@/app/navigation';
import { cn } from '@/shared/utils/cn';

function navigationClassName(isActive: boolean): string {
  return cn(
    'flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors',
    isActive
      ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100'
      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  );
}

export function DesktopSidebar() {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-72 overflow-hidden border-r border-slate-200 bg-white/95 p-4 backdrop-blur lg:flex lg:flex-col dark:border-slate-800 dark:bg-slate-950/95">
      <div className="flex shrink-0 items-center gap-3 px-2 py-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-brand-700 text-white shadow-sm">
          <Dumbbell aria-hidden="true" className="size-6" />
        </span>
        <div>
          <p className="text-lg font-bold text-slate-950 dark:text-white">SportPilot</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">Sport · nutrition · progression</p>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pr-1">
        <div className="flex min-h-full flex-col">
          <nav aria-label="Navigation principale" className="mt-5 space-y-1">
            {primaryNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.end ?? false}
                  className={({ isActive }) => navigationClassName(isActive)}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>

          <nav
            aria-label="Navigation secondaire"
            className="mt-auto space-y-1 border-t border-slate-200 pt-4 dark:border-slate-800"
          >
            {secondaryNavigation.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => navigationClassName(isActive)}
                >
                  <Icon aria-hidden="true" className="size-5" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
