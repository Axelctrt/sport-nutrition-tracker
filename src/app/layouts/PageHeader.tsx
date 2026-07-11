import { ArrowLeft, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { MobileAppMenu } from '@/app/layouts/MobileAppMenu';
import { mobileHeaderBackDestination, primaryMobileRoutes } from '@/app/layouts/mobileHeaderNavigation';
import { getRouteTitle } from '@/app/routeMetadata';
import { routePaths } from '@/app/routePaths';
import { InstallPwaButton } from '@/shared/ui/InstallPwaButton';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

export function PageHeader() {
  const location = useLocation();
  const title = getRouteTitle(location.pathname);
  const isPrimaryMobileRoute = primaryMobileRoutes.has(location.pathname);

  useEffect(() => {
    document.title = title === 'SportPilot' ? title : `${title} · SportPilot`;
  }, [title]);

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex min-h-16 max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          {isPrimaryMobileRoute ? (
            <Link
              to={routePaths.settings}
              aria-label="Ouvrir les paramètres"
              title="Paramètres"
              className="inline-flex size-[var(--sp-touch-target)] shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <Settings aria-hidden="true" className="size-5" />
            </Link>
          ) : (
            <Link
              to={mobileHeaderBackDestination(location.pathname)}
              aria-label="Retour"
              title="Retour"
              className="inline-flex size-[var(--sp-touch-target)] shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950 dark:text-white">
              {title}
            </p>
            <p className="hidden text-xs text-slate-500 lg:block dark:text-slate-400">
              SportPilot
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <InstallPwaButton className="hidden lg:inline-flex" />
          <MobileAppMenu />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
