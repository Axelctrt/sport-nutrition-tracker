import { ArrowLeft, Settings } from 'lucide-react';
import { useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { MobileAppMenu } from '@/app/layouts/MobileAppMenu';
import {
  primaryMobileRoutes,
  resolveMobileHeaderBackAction,
} from '@/app/layouts/mobileHeaderNavigation';
import { getRouteTitle } from '@/app/routeMetadata';
import { routePaths } from '@/app/routePaths';
import { InstallPwaButton } from '@/shared/ui/InstallPwaButton';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

const mobileNavigationButtonClassName = 'inline-flex size-[var(--sp-touch-target)] shrink-0 items-center justify-center rounded-xl text-slate-700 transition-colors hover:bg-slate-100 lg:hidden dark:text-slate-200 dark:hover:bg-slate-800';

export function PageHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const title = getRouteTitle(location.pathname);
  const isPrimaryMobileRoute = primaryMobileRoutes.has(location.pathname);
  const backAction = resolveMobileHeaderBackAction(location);

  useEffect(() => {
    document.title = title === 'SportPilot' ? title : `${title} · SportPilot`;
  }, [title]);

  return (
    <header className="sp-navigation-shell sticky top-0 z-20 border-b">
      <div className="mx-auto flex min-h-16 max-w-7xl min-w-0 items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          {isPrimaryMobileRoute ? (
            <Link
              to={routePaths.settings}
              aria-label="Ouvrir les paramètres"
              title="Paramètres"
              className={mobileNavigationButtonClassName}
            >
              <Settings aria-hidden="true" className="size-5" />
            </Link>
          ) : backAction.kind === 'history' ? (
            <button
              type="button"
              aria-label="Retour"
              title="Retour"
              className={mobileNavigationButtonClassName}
              onClick={() => void navigate(-1)}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </button>
          ) : (
            <Link
              to={backAction.to}
              state={backAction.state}
              aria-label="Retour"
              title="Retour"
              className={mobileNavigationButtonClassName}
            >
              <ArrowLeft aria-hidden="true" className="size-5" />
            </Link>
          )}

          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--sp-text-primary)]">
              {title}
            </p>
            <p className="hidden text-xs text-[var(--sp-text-muted)] lg:block">
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
