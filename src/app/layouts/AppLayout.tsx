import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';

import { DesktopSidebar } from '@/app/layouts/DesktopSidebar';
import { MobileBottomNavigation } from '@/app/layouts/MobileBottomNavigation';
import { PageHeader } from '@/app/layouts/PageHeader';
import { OfflineStatusBanner } from '@/pwa/OfflineStatusBanner';

export function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname]);

  return (
    <div className="min-h-screen text-slate-900 dark:text-slate-100">
      <a
        href="#main-content"
        className="fixed left-3 top-3 z-[100] -translate-y-20 rounded-lg bg-slate-950 px-4 py-2 text-sm font-semibold text-white transition-transform focus:translate-y-0"
      >
        Aller au contenu
      </a>

      <DesktopSidebar />

      <div className="min-w-0 lg:pl-72">
        <PageHeader />
        <OfflineStatusBanner />

        <main
          id="main-content"
          className="safe-page-bottom mx-auto min-w-0 max-w-7xl overflow-x-clip px-4 py-6 sm:px-6 lg:px-8"
        >
          <Outlet />
        </main>
      </div>

      <MobileBottomNavigation />
    </div>
  );
}
