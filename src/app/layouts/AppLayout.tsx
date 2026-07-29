import { Outlet } from 'react-router-dom';

import { BackupReminderCoordinator } from '@/app/backup/BackupReminderCoordinator';
import { GlobalSearchShortcut } from '@/app/search/GlobalSearchShortcut';
import { DesktopSidebar } from '@/app/layouts/DesktopSidebar';
import { MobileBottomNavigation } from '@/app/layouts/MobileBottomNavigation';
import { NavigationScrollManager } from '@/app/layouts/NavigationScrollManager';
import { PageHeader } from '@/app/layouts/PageHeader';
import { SecondaryPageContext } from '@/app/layouts/SecondaryPageContext';
import { OfflineStatusBanner } from '@/pwa/OfflineStatusBanner';
import { useClearInputValueOnFocus } from '@/shared/forms/useClearInputValueOnFocus';

export function AppLayout() {
  useClearInputValueOnFocus();

  return (
    <div className="sport-theme-app min-h-screen text-[var(--sp-text-primary)]">
      <NavigationScrollManager />
      <a
        href="#main-content"
        onClick={(event) => {
          event.preventDefault();
          document.getElementById('main-content')?.focus();
        }}
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Aller au contenu
      </a>

      <DesktopSidebar />

      <div className="min-w-0 lg:pl-72">
        <PageHeader />
        <OfflineStatusBanner />
        <GlobalSearchShortcut />
        <BackupReminderCoordinator />

        <main
          id="main-content"
          tabIndex={-1}
          className="safe-page-bottom mx-auto min-w-0 max-w-7xl overflow-x-clip px-4 py-6 sm:px-6 lg:px-8"
        >
          <SecondaryPageContext />
          <Outlet />
        </main>
      </div>

      <MobileBottomNavigation />
    </div>
  );
}
