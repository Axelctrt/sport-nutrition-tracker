import {
  PRELOAD_RECOVERY_STORAGE_KEY,
  installPreloadErrorRecovery,
  isDynamicImportFailure,
  schedulePreloadRecoveryReset,
} from '@/pwa/preloadErrorRecovery';

function preloadError(payload: unknown): Event {
  const event = new Event('vite:preloadError', { cancelable: true });
  Object.defineProperty(event, 'payload', { value: payload });
  return event;
}

describe('preloadErrorRecovery', () => {
  beforeEach(() => {
    sessionStorage.clear();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('reconnaît les erreurs de chargement dynamique usuelles', () => {
    expect(isDynamicImportFailure(new TypeError(
      'Failed to fetch dynamically imported module: https://example.test/assets/Page.js',
    ))).toBe(true);
    expect(isDynamicImportFailure(new Error('Importing a module script failed.'))).toBe(true);
    expect(isDynamicImportFailure(new Error('Erreur métier'))).toBe(false);
  });

  it('recharge une seule fois lorsqu’un ancien chunk n’existe plus', () => {
    const target = new EventTarget();
    const reload = vi.fn();
    let now = 1_000;
    const uninstall = installPreloadErrorRecovery({
      target,
      storage: sessionStorage,
      reload,
      now: () => now,
    });

    const first = preloadError(new TypeError('Failed to fetch dynamically imported module'));
    target.dispatchEvent(first);
    expect(first.defaultPrevented).toBe(true);
    expect(reload).toHaveBeenCalledOnce();

    now += 1_000;
    const second = preloadError(new TypeError('Failed to fetch dynamically imported module'));
    target.dispatchEvent(second);
    expect(second.defaultPrevented).toBe(false);
    expect(reload).toHaveBeenCalledOnce();

    uninstall();
  });

  it('réarme la récupération après un démarrage sain', () => {
    sessionStorage.setItem(PRELOAD_RECOVERY_STORAGE_KEY, '1000');
    schedulePreloadRecoveryReset({ storage: sessionStorage, delayMs: 5_000 });

    vi.advanceTimersByTime(4_999);
    expect(sessionStorage.getItem(PRELOAD_RECOVERY_STORAGE_KEY)).toBe('1000');

    vi.advanceTimersByTime(1);
    expect(sessionStorage.getItem(PRELOAD_RECOVERY_STORAGE_KEY)).toBeNull();
  });
});
