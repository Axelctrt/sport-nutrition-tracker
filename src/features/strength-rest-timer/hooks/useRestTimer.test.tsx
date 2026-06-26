import { act, renderHook } from '@testing-library/react';
import { useRestTimer, type RestTimerPreferences } from '@/features/strength-rest-timer/hooks/useRestTimer';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();
  get length() { return this.values.size; }
  clear() { this.values.clear(); }
  getItem(key: string) { return this.values.get(key) ?? null; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  setItem(key: string, value: string) { this.values.set(key, value); }
}

const preferences: RestTimerPreferences = {
  autoStart: true,
  soundEnabled: true,
  vibrationEnabled: true,
};

describe('useRestTimer', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-26T12:00:00.000Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('prépare le son pendant une interaction utilisateur lorsque le réglage est actif', () => {
    const prepareSound = vi.fn(() => true);
    const dependencies = {
      storage: new MemoryStorage(),
      now: () => Date.now(),
      vibrate: vi.fn(() => true),
      prepareSound,
      playSound: vi.fn(() => true),
    };
    const { result } = renderHook(() => useRestTimer('session-1', preferences, dependencies));

    act(() => result.current.prepareFeedback());

    expect(prepareSound).toHaveBeenCalledTimes(1);
  });

  it('gère démarrage, pause, reprise, ajustements et arrêt', () => {
    const storage = new MemoryStorage();
    const dependencies = {
      storage,
      now: () => Date.now(),
      vibrate: vi.fn(() => true),
      playSound: vi.fn(() => true),
    };
    const { result } = renderHook(() => useRestTimer('session-1', preferences, dependencies));

    act(() => result.current.start({
      sessionId: 'session-1',
      sessionExerciseId: 'exercise-1',
      exerciseName: 'Développé couché',
      durationSeconds: 60,
    }));
    expect(result.current.remainingSeconds).toBe(60);

    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.remainingSeconds).toBe(50);

    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(10_000));
    expect(result.current.remainingSeconds).toBe(50);

    act(() => result.current.adjust(30));
    expect(result.current.remainingSeconds).toBe(80);
    act(() => result.current.resume());
    expect(result.current.state.status).toBe('running');

    act(() => result.current.stop());
    expect(result.current.state.status).toBe('idle');
    expect(storage.length).toBe(0);
  });

  it('recalcule à la reprise de l’application et déclenche chaque retour une seule fois', () => {
    const storage = new MemoryStorage();
    const vibrate = vi.fn(() => true);
    const playSound = vi.fn(() => true);
    const dependencies = { storage, now: () => Date.now(), vibrate, playSound };
    const { result } = renderHook(() => useRestTimer('session-1', preferences, dependencies));

    act(() => result.current.start({
      sessionId: 'session-1',
      sessionExerciseId: 'exercise-1',
      exerciseName: 'Développé couché',
      durationSeconds: 5,
    }));
    vi.setSystemTime(new Date('2026-06-26T12:00:08.000Z'));
    act(() => document.dispatchEvent(new Event('visibilitychange')));

    expect(result.current.state.status).toBe('expired');
    expect(result.current.announcement).toContain('Repos terminé');
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledTimes(1);

    act(() => document.dispatchEvent(new Event('visibilitychange')));
    expect(vibrate).toHaveBeenCalledTimes(1);
    expect(playSound).toHaveBeenCalledTimes(1);
  });

  it('remplace le contexte lors du changement d’exercice', () => {
    const dependencies = {
      storage: new MemoryStorage(),
      now: () => Date.now(),
      vibrate: vi.fn(() => true),
      playSound: vi.fn(() => true),
    };
    const { result } = renderHook(() => useRestTimer('session-1', preferences, dependencies));

    act(() => result.current.start({
      sessionId: 'session-1',
      sessionExerciseId: 'exercise-1',
      exerciseName: 'Développé couché',
      durationSeconds: 90,
    }));
    act(() => result.current.start({
      sessionId: 'session-1',
      sessionExerciseId: 'exercise-2',
      exerciseName: 'Rowing barre',
      durationSeconds: 60,
    }));

    expect(result.current.state).toMatchObject({
      status: 'running',
      sessionExerciseId: 'exercise-2',
      exerciseName: 'Rowing barre',
    });
  });
});
