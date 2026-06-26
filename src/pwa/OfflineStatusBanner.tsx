import { Wifi, WifiOff } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { cn } from '@/shared/utils/cn';

type ConnectionState = 'online' | 'offline' | 'restored';

export function OfflineStatusBanner() {
  const [connectionState, setConnectionState] = useState<ConnectionState>(() =>
    navigator.onLine ? 'online' : 'offline',
  );
  const stateRef = useRef(connectionState);
  const restoreTimerRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    stateRef.current = connectionState;
  }, [connectionState]);

  useEffect(() => {
    const clearRestoreTimer = () => {
      if (restoreTimerRef.current !== undefined) {
        window.clearTimeout(restoreTimerRef.current);
        restoreTimerRef.current = undefined;
      }
    };

    const handleOffline = () => {
      clearRestoreTimer();
      stateRef.current = 'offline';
      setConnectionState('offline');
    };

    const handleOnline = () => {
      clearRestoreTimer();
      const shouldConfirmRestoration = stateRef.current === 'offline';
      const nextState: ConnectionState = shouldConfirmRestoration ? 'restored' : 'online';
      stateRef.current = nextState;
      setConnectionState(nextState);

      if (shouldConfirmRestoration) {
        restoreTimerRef.current = window.setTimeout(() => {
          stateRef.current = 'online';
          setConnectionState('online');
          restoreTimerRef.current = undefined;
        }, 4000);
      }
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      clearRestoreTimer();
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (connectionState === 'online') {
    return null;
  }

  const restored = connectionState === 'restored';
  const Icon = restored ? Wifi : WifiOff;

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'border-b px-4 py-2 text-sm',
        restored
          ? 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-100'
          : 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-100',
      )}
    >
      <div className="mx-auto flex max-w-7xl items-center gap-2 sm:px-2 lg:px-4">
        <Icon aria-hidden="true" className="size-4 shrink-0" />
        <span>
          {restored
            ? 'Connexion rétablie.'
            : 'Mode hors connexion : les données locales restent disponibles. Les services externes attendront le retour du réseau.'}
        </span>
      </div>
    </div>
  );
}
