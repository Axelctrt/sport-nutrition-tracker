import { useEffect, useState, type PropsWithChildren } from 'react';
import { useDatabase } from '@/app/providers/database/useDatabase';
import { useProfile } from '@/app/providers/profile/useProfile';
import { AppSplashScreen } from '@/shared/ui/AppSplashScreen';

export function AppReadinessBoundary({ children }: PropsWithChildren) {
  const database = useDatabase();
  const profile = useProfile();
  const [initializationCompleted, setInitializationCompleted] = useState(false);

  useEffect(() => {
    const databaseSettled = database.status !== 'initializing';
    const profileSettled = profile.status !== 'loading';
    if (databaseSettled && profileSettled) {
      setInitializationCompleted(true);
    }
  }, [database.status, profile.status]);

  if (!initializationCompleted) {
    return <AppSplashScreen />;
  }

  return children;
}
