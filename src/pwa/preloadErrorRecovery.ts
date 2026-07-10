const PRELOAD_RECOVERY_STORAGE_KEY = 'sportpilot:preload-recovery-attempted-at';
const PRELOAD_RECOVERY_WINDOW_MS = 30_000;

interface PreloadErrorEvent extends Event {
  payload?: unknown;
}

interface PreloadErrorRecoveryOptions {
  target?: EventTarget;
  storage?: Storage;
  reload?: () => void;
  now?: () => number;
}

export function isDynamicImportFailure(error: unknown): boolean {
  const message = error instanceof Error
    ? error.message
    : typeof error === 'string'
      ? error
      : '';

  return [
    'failed to fetch dynamically imported module',
    'error loading dynamically imported module',
    'importing a module script failed',
    'unable to preload css',
  ].some((pattern) => message.toLowerCase().includes(pattern));
}

export function installPreloadErrorRecovery({
  target = window,
  storage = window.sessionStorage,
  reload = () => window.location.reload(),
  now = () => Date.now(),
}: PreloadErrorRecoveryOptions = {}): () => void {
  const handlePreloadError = (event: Event) => {
    const preloadEvent = event as PreloadErrorEvent;
    if (!isDynamicImportFailure(preloadEvent.payload)) return;

    const attemptedAt = Number(storage.getItem(PRELOAD_RECOVERY_STORAGE_KEY));
    const recentlyAttempted = Number.isFinite(attemptedAt)
      && attemptedAt > 0
      && now() - attemptedAt < PRELOAD_RECOVERY_WINDOW_MS;

    if (recentlyAttempted) return;

    event.preventDefault();
    storage.setItem(PRELOAD_RECOVERY_STORAGE_KEY, String(now()));
    reload();
  };

  target.addEventListener('vite:preloadError', handlePreloadError);
  return () => target.removeEventListener('vite:preloadError', handlePreloadError);
}

export function schedulePreloadRecoveryReset({
  storage = window.sessionStorage,
  delayMs = 5_000,
}: {
  storage?: Storage;
  delayMs?: number;
} = {}): () => void {
  const timer = window.setTimeout(() => {
    storage.removeItem(PRELOAD_RECOVERY_STORAGE_KEY);
  }, delayMs);

  return () => window.clearTimeout(timer);
}

export { PRELOAD_RECOVERY_STORAGE_KEY };
