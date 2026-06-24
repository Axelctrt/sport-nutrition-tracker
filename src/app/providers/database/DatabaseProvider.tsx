import { useEffect, useState, type PropsWithChildren } from 'react';
import {
  DatabaseContext,
  type DatabaseContextValue,
} from '@/app/providers/database/DatabaseContext';
import { useTheme } from '@/app/providers/useTheme';
import { initializeDatabase } from '@/infrastructure/database/databaseLifecycle';
import { requestPersistentStorage } from '@/infrastructure/storage/persistentStorage';

const initialValue: DatabaseContextValue = {
  status: 'initializing',
};

export function DatabaseProvider({ children }: PropsWithChildren) {
  const [value, setValue] = useState<DatabaseContextValue>(initialValue);
  const { setTheme } = useTheme();

  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        const result = await initializeDatabase();
        setTheme(result.settings.theme);

        if (result.settings.requestPersistentStorage) {
          void requestPersistentStorage().catch(() => undefined);
        }

        if (isMounted) {
          setValue({ status: 'ready' });
        }
      } catch (error) {
        const errorMessage = error instanceof Error
          ? error.message
          : 'Une erreur inconnue empêche l’accès aux données locales.';

        if (isMounted) {
          setValue({ status: 'error', errorMessage });
        }
      }
    };

    void initialize();

    return () => {
      isMounted = false;
    };
  }, [setTheme]);

  return <DatabaseContext value={value}>{children}</DatabaseContext>;
}
