import { Link, useLocation } from 'react-router-dom';
import { mobileNavigation, navigationItemIsActive } from '@/app/navigation';
import { cn } from '@/shared/utils/cn';

export function MobileBottomNavigation() {
  const location = useLocation();

  return (
    <nav
      aria-label="Navigation mobile"
      className="sp-navigation-shell safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-2 lg:hidden"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-4 gap-1">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          const isActive = navigationItemIsActive(location.pathname, item);
          return (
            <li key={item.path}>
              <Link
                to={item.path}
                aria-current={isActive ? 'page' : undefined}
                data-responsive-essential="action"
                className={cn(
                  'sp-navigation-link flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-0.5 text-xs font-medium',
                  isActive && 'is-active',
                )}
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
