import { Link, useLocation } from 'react-router-dom';
import { mobileNavigation, navigationItemIsActive } from '@/app/navigation';
import { cn } from '@/shared/utils/cn';
import '@/styles/finalMobilePolish.css';

export function MobileBottomNavigation() {
  const location = useLocation();
  const activeIndex = Math.max(
    0,
    mobileNavigation.findIndex((item) => navigationItemIsActive(location.pathname, item)),
  );

  return (
    <nav
      aria-label="Navigation mobile"
      className="sp-navigation-shell safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t px-2 pt-2 lg:hidden"
    >
      <div className="sp-mobile-navigation-track mx-auto max-w-xl">
        <span
          aria-hidden="true"
          className="sp-mobile-navigation-indicator"
          style={{ transform: `translateX(${activeIndex * 100}%)` }}
        />
        <ul className="relative z-10 grid grid-cols-4 gap-1">
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
                  <Icon aria-hidden="true" className="sp-navigation-link__icon size-5" />
                  <span className="sp-navigation-link__label">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
