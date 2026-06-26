import { useEffect, useState } from 'react';

interface NavigatorWithStandalone extends Navigator {
  standalone?: boolean;
}

function readStandaloneMode(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return false;
  }

  return window.matchMedia('(display-mode: standalone)').matches
    || Boolean((navigator as NavigatorWithStandalone).standalone);
}

function readIosPlatform(): boolean {
  if (typeof navigator === 'undefined') {
    return false;
  }

  const touchMac = navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1;
  return /iPad|iPhone|iPod/i.test(navigator.userAgent) || touchMac;
}

export interface PwaEnvironment {
  isIos: boolean;
  isStandalone: boolean;
}

export function usePwaEnvironment(): PwaEnvironment {
  const [environment, setEnvironment] = useState<PwaEnvironment>(() => ({
    isIos: readIosPlatform(),
    isStandalone: readStandaloneMode(),
  }));

  useEffect(() => {
    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const refresh = () => {
      setEnvironment({
        isIos: readIosPlatform(),
        isStandalone: readStandaloneMode(),
      });
    };

    mediaQuery.addEventListener('change', refresh);
    window.addEventListener('appinstalled', refresh);

    return () => {
      mediaQuery.removeEventListener('change', refresh);
      window.removeEventListener('appinstalled', refresh);
    };
  }, []);

  return environment;
}
