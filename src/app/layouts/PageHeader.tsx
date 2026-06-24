import { UserRound } from 'lucide-react';
import { NavLink } from 'react-router-dom';
import { routePaths } from '@/app/routePaths';
import { InstallPwaButton } from '@/shared/ui/InstallPwaButton';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';
import { cn } from '@/shared/utils/cn';

export function PageHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex min-h-16 max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 lg:hidden dark:text-white">
            SportPilot
          </p>
          <p className="hidden text-sm text-slate-500 lg:block dark:text-slate-400">
            Données locales sur cet appareil
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <InstallPwaButton />
          <NavLink
            to={routePaths.profile}
            aria-label="Modifier le profil"
            title="Profil"
            className={({ isActive }) =>
              cn(
                'inline-flex size-10 items-center justify-center rounded-xl transition-colors lg:hidden',
                isActive
                  ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100'
                  : 'text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800',
              )
            }
          >
            <UserRound aria-hidden="true" className="size-5" />
          </NavLink>
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
