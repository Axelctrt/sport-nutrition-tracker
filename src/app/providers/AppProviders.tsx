import type { PropsWithChildren } from 'react';
import { AppReadinessBoundary } from '@/app/providers/AppReadinessBoundary';
import { TrashUndoCoordinator } from '@/app/trash/TrashUndoCoordinator';
import { DatabaseProvider } from '@/app/providers/database/DatabaseProvider';
import { ErrorBoundaryProvider } from '@/app/providers/ErrorBoundaryProvider';
import { ProfileProvider } from '@/app/providers/profile/ProfileProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';
import { ToastProvider } from '@/shared/toast/ToastProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundaryProvider>
      <ThemeProvider>
        <ToastProvider>
          <DatabaseProvider>
            <ProfileProvider>
            <TrashUndoCoordinator>
              <AppReadinessBoundary>{children}</AppReadinessBoundary>
              </TrashUndoCoordinator>
          </ProfileProvider>
          </DatabaseProvider>
        </ToastProvider>
      </ThemeProvider>
    </ErrorBoundaryProvider>
  );
}
