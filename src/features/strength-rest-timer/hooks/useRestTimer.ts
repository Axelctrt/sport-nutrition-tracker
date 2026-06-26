import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  adjustRestTimer,
  getRestTimerRemainingSeconds,
  idleRestTimerState,
  markRestTimerFeedbackDelivered,
  pauseRestTimer,
  resumeRestTimer,
  startRestTimer,
  stopRestTimer,
  synchronizeRestTimer,
  type RestTimerState,
  type StartRestTimerInput,
} from '@/domain/strength/restTimer';
import {
  playRestTimerSound,
  prepareRestTimerSound,
  vibrateForRestTimer,
} from '@/infrastructure/feedback/restTimerFeedback';

export interface RestTimerPreferences {
  autoStart: boolean;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
}

export const defaultRestTimerPreferences: RestTimerPreferences = {
  autoStart: true,
  soundEnabled: false,
  vibrationEnabled: true,
};

interface RestTimerDependencies {
  now: () => number;
  storage: Storage | undefined;
  vibrate: () => boolean;
  prepareSound: () => boolean;
  playSound: () => boolean;
}

const storagePrefix = 'sportpilot:rest-timer:';

function defaultDependencies(): RestTimerDependencies {
  return {
    now: () => Date.now(),
    storage: typeof window === 'undefined' ? undefined : window.sessionStorage,
    vibrate: vibrateForRestTimer,
    prepareSound: prepareRestTimerSound,
    playSound: playRestTimerSound,
  };
}

function readStoredState(
  sessionId: string,
  dependencies: RestTimerDependencies,
): RestTimerState {
  if (!dependencies.storage) return idleRestTimerState;
  try {
    const raw = dependencies.storage.getItem(`${storagePrefix}${sessionId}`);
    if (!raw) return idleRestTimerState;
    const parsed = JSON.parse(raw) as RestTimerState;
    if (parsed.status === 'idle' || !('sessionId' in parsed) || parsed.sessionId !== sessionId) {
      return idleRestTimerState;
    }
    return synchronizeRestTimer(parsed, dependencies.now());
  } catch {
    return idleRestTimerState;
  }
}

function persistState(
  sessionId: string,
  state: RestTimerState,
  dependencies: RestTimerDependencies,
): void {
  if (!dependencies.storage) return;
  try {
    const key = `${storagePrefix}${sessionId}`;
    if (state.status === 'idle') dependencies.storage.removeItem(key);
    else dependencies.storage.setItem(key, JSON.stringify(state));
  } catch {
    // Le minuteur reste fonctionnel en mémoire si le stockage de session est indisponible.
  }
}

export function useRestTimer(
  sessionId: string,
  preferences: RestTimerPreferences,
  injectedDependencies?: Partial<RestTimerDependencies>,
) {
  const dependencies = useMemo(
    () => ({ ...defaultDependencies(), ...injectedDependencies }),
    [injectedDependencies],
  );
  const [state, setState] = useState<RestTimerState>(() => readStoredState(sessionId, dependencies));
  const [now, setNow] = useState(() => dependencies.now());
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setState(readStoredState(sessionId, dependencies));
    setNow(dependencies.now());
  }, [dependencies, sessionId]);

  useEffect(() => {
    persistState(sessionId, state, dependencies);
  }, [dependencies, sessionId, state]);

  useEffect(() => {
    if (state.status !== 'running') return undefined;
    const tick = () => {
      const current = dependencies.now();
      setNow(current);
      setState((previous) => synchronizeRestTimer(previous, current));
    };
    const interval = window.setInterval(tick, 500);
    const handleVisibilityChange = () => tick();
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [dependencies, state.status]);

  useEffect(() => {
    if (state.status !== 'expired' || state.feedbackDelivered) return;
    if (preferences.vibrationEnabled) dependencies.vibrate();
    if (preferences.soundEnabled) dependencies.playSound();
    setAnnouncement(`Repos terminé pour ${state.exerciseName}.`);
    setState((current) => markRestTimerFeedbackDelivered(current));
  }, [dependencies, preferences.soundEnabled, preferences.vibrationEnabled, state]);


  const prepareFeedback = useCallback(() => {
    if (preferences.soundEnabled) dependencies.prepareSound();
  }, [dependencies, preferences.soundEnabled]);

  const start = useCallback((input: StartRestTimerInput) => {
    const current = dependencies.now();
    setNow(current);
    setAnnouncement('');
    setState(startRestTimer(input, current));
  }, [dependencies]);

  const pause = useCallback(() => {
    const current = dependencies.now();
    setNow(current);
    setState((previous) => pauseRestTimer(previous, current));
  }, [dependencies]);

  const resume = useCallback(() => {
    const current = dependencies.now();
    setNow(current);
    setAnnouncement('');
    setState((previous) => resumeRestTimer(previous, current));
  }, [dependencies]);

  const adjust = useCallback((seconds: number) => {
    const current = dependencies.now();
    setNow(current);
    setAnnouncement('');
    setState((previous) => adjustRestTimer(previous, seconds, current));
  }, [dependencies]);

  const stop = useCallback(() => {
    const idle = stopRestTimer();
    persistState(sessionId, idle, dependencies);
    setAnnouncement('');
    setState(idle);
  }, [dependencies, sessionId]);

  return {
    state,
    remainingSeconds: getRestTimerRemainingSeconds(state, now),
    announcement,
    isVisible: state.status !== 'idle',
    prepareFeedback,
    start,
    pause,
    resume,
    adjust,
    stop,
  };
}
