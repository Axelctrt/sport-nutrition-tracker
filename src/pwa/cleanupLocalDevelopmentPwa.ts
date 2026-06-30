const LOCAL_DEVELOPMENT_HOSTS = new Set(['127.0.0.1', 'localhost']);
const SPORTPILOT_CACHE_PATTERN = /(workbox|precache|sportpilot)/i;
const RELOAD_GUARD_KEY = 'sportpilot-local-pwa-cleanup-reload';

export function isLocalDevelopmentOrigin(
  locationValue: Location = window.location,
): boolean {
  return LOCAL_DEVELOPMENT_HOSTS.has(locationValue.hostname);
}

/**
 * Le service worker est utile dans le build PWA, mais il perturbe le serveur Vite
 * lorsqu'une ancienne version contrôle encore localhost. Cette fonction ne touche
 * ni IndexedDB ni localStorage et ne s'exécute que dans le serveur de développement.
 */
export async function cleanupLocalDevelopmentPwa(): Promise<boolean> {
  if (!import.meta.env.DEV) return false;
  if (!isLocalDevelopmentOrigin()) return false;

  const wasControlled =
    'serviceWorker' in navigator && navigator.serviceWorker.controller !== null;

  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(
      registrations.map((registration) => registration.unregister()),
    );
  }

  if ('caches' in window) {
    const cacheNames = await caches.keys();
    await Promise.all(
      cacheNames
        .filter((cacheName) => SPORTPILOT_CACHE_PATTERN.test(cacheName))
        .map((cacheName) => caches.delete(cacheName)),
    );
  }

  if (
    wasControlled &&
    sessionStorage.getItem(RELOAD_GUARD_KEY) !== 'done'
  ) {
    sessionStorage.setItem(RELOAD_GUARD_KEY, 'done');
    window.location.reload();
    return true;
  }

  sessionStorage.removeItem(RELOAD_GUARD_KEY);
  return false;
}
