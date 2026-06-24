import type { PropsWithChildren } from 'react';
import { DatabaseProvider } from '@/app/providers/database/DatabaseProvider';
import { ErrorBoundaryProvider } from '@/app/providers/ErrorBoundaryProvider';
import { ProfileProvider } from '@/app/providers/profile/ProfileProvider';
import { ThemeProvider } from '@/app/providers/ThemeProvider';

export function AppProviders({ children }: PropsWithChildren) {
  return (
    <ErrorBoundaryProvider>
      <ThemeProvider>
        <DatabaseProvider>
          <ProfileProvider>{children}</ProfileProvider>
        </DatabaseProvider>
      </ThemeProvider>
    </ErrorBoundaryProvider>
  );
}
