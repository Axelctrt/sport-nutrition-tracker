import { InstallPwaButton } from '@/shared/ui/InstallPwaButton';
import { ThemeToggle } from '@/shared/ui/ThemeToggle';

export function PageHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-slate-200/80 bg-slate-50/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90">
      <div className="mx-auto flex min-h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-slate-950 lg:hidden dark:text-white">
            SportPilot
          </p>
          <p className="hidden text-sm text-slate-500 lg:block dark:text-slate-400">
            Données locales sur cet appareil
          </p>
        </div>
        <div className="flex items-center gap-2">
          <InstallPwaButton />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}
