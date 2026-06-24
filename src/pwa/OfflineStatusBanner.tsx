import { WifiOff } from 'lucide-react';
import { useEffect, useState } from 'react';

export function OfflineStatusBanner() {
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline) {
    return null;
  }

  return (
    <div role="status" className="border-b border-amber-300 bg-amber-100 px-4 py-2 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100">
      <div className="mx-auto flex max-w-7xl items-center gap-2 sm:px-2 lg:px-4">
        <WifiOff aria-hidden="true" className="size-4 shrink-0" />
        Mode hors connexion : les fonctionnalités locales restent disponibles.
      </div>
    </div>
  );
}
