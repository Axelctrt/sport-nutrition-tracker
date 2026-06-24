import { NavLink } from 'react-router-dom';
import { mobileNavigation } from '@/app/navigation';
import { cn } from '@/shared/utils/cn';

export function MobileBottomNavigation() {
  return (
    <nav
      aria-label="Navigation mobile"
      className="safe-area-bottom fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pt-2 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-950/95"
    >
      <ul className="mx-auto grid max-w-xl grid-cols-5 gap-1">
        {mobileNavigation.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.end ?? false}
                className={({ isActive }) =>
                  cn(
                    'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[0.7rem] font-medium transition-colors',
                    isActive
                      ? 'bg-brand-100 text-brand-900 dark:bg-brand-900/50 dark:text-brand-100'
                      : 'text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800',
                  )
                }
              >
                <Icon aria-hidden="true" className="size-5" />
                <span>{item.label}</span>
              </NavLink>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
