export type RestTimerStatus = 'idle' | 'running' | 'paused' | 'expired';

interface RestTimerContext {
  sessionId: string;
  sessionExerciseId: string;
  exerciseName: string;
  durationSeconds: number;
}

export interface IdleRestTimerState {
  status: 'idle';
}

export interface RunningRestTimerState extends RestTimerContext {
  status: 'running';
  endAt: number;
}

export interface PausedRestTimerState extends RestTimerContext {
  status: 'paused';
  pausedRemainingSeconds: number;
}

export interface ExpiredRestTimerState extends RestTimerContext {
  status: 'expired';
  feedbackDelivered: boolean;
}

export type RestTimerState =
  | IdleRestTimerState
  | RunningRestTimerState
  | PausedRestTimerState
  | ExpiredRestTimerState;

export interface StartRestTimerInput extends RestTimerContext {}

export const idleRestTimerState: IdleRestTimerState = { status: 'idle' };

function normalizedSeconds(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.round(value));
}

export function startRestTimer(input: StartRestTimerInput, now = Date.now()): RestTimerState {
  const durationSeconds = normalizedSeconds(input.durationSeconds);
  if (durationSeconds === 0) return idleRestTimerState;

  return {
    ...input,
    durationSeconds,
    status: 'running',
    endAt: now + durationSeconds * 1_000,
  };
}

export function getRestTimerRemainingSeconds(state: RestTimerState, now = Date.now()): number {
  if (state.status === 'idle' || state.status === 'expired') return 0;
  if (state.status === 'paused') return normalizedSeconds(state.pausedRemainingSeconds);
  return Math.max(0, Math.ceil((state.endAt - now) / 1_000));
}

export function synchronizeRestTimer(state: RestTimerState, now = Date.now()): RestTimerState {
  if (state.status !== 'running') return state;
  if (getRestTimerRemainingSeconds(state, now) > 0) return state;

  return {
    sessionId: state.sessionId,
    sessionExerciseId: state.sessionExerciseId,
    exerciseName: state.exerciseName,
    durationSeconds: state.durationSeconds,
    status: 'expired',
    feedbackDelivered: false,
  };
}

export function pauseRestTimer(state: RestTimerState, now = Date.now()): RestTimerState {
  const synchronized = synchronizeRestTimer(state, now);
  if (synchronized.status !== 'running') return synchronized;

  return {
    sessionId: synchronized.sessionId,
    sessionExerciseId: synchronized.sessionExerciseId,
    exerciseName: synchronized.exerciseName,
    durationSeconds: synchronized.durationSeconds,
    status: 'paused',
    pausedRemainingSeconds: getRestTimerRemainingSeconds(synchronized, now),
  };
}

export function resumeRestTimer(state: RestTimerState, now = Date.now()): RestTimerState {
  if (state.status !== 'paused') return state;
  const remainingSeconds = normalizedSeconds(state.pausedRemainingSeconds);
  if (remainingSeconds === 0) {
    return {
      sessionId: state.sessionId,
      sessionExerciseId: state.sessionExerciseId,
      exerciseName: state.exerciseName,
      durationSeconds: state.durationSeconds,
      status: 'expired',
      feedbackDelivered: false,
    };
  }

  return {
    sessionId: state.sessionId,
    sessionExerciseId: state.sessionExerciseId,
    exerciseName: state.exerciseName,
    durationSeconds: state.durationSeconds,
    status: 'running',
    endAt: now + remainingSeconds * 1_000,
  };
}

export function adjustRestTimer(
  state: RestTimerState,
  deltaSeconds: number,
  now = Date.now(),
): RestTimerState {
  if (state.status === 'idle') return state;
  const delta = Math.round(deltaSeconds);
  const currentRemaining = getRestTimerRemainingSeconds(state, now);
  const nextRemaining = Math.max(0, currentRemaining + delta);

  if (nextRemaining === 0) {
    return {
      sessionId: state.sessionId,
      sessionExerciseId: state.sessionExerciseId,
      exerciseName: state.exerciseName,
      durationSeconds: state.durationSeconds,
      status: 'expired',
      feedbackDelivered: false,
    };
  }

  if (state.status === 'paused') {
    return { ...state, pausedRemainingSeconds: nextRemaining };
  }

  return {
    sessionId: state.sessionId,
    sessionExerciseId: state.sessionExerciseId,
    exerciseName: state.exerciseName,
    durationSeconds: state.durationSeconds,
    status: 'running',
    endAt: now + nextRemaining * 1_000,
  };
}

export function markRestTimerFeedbackDelivered(state: RestTimerState): RestTimerState {
  return state.status === 'expired' ? { ...state, feedbackDelivered: true } : state;
}

export function stopRestTimer(): RestTimerState {
  return idleRestTimerState;
}

export function formatRestTimer(seconds: number): string {
  const normalized = normalizedSeconds(seconds);
  const minutes = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}

export function formatRestDuration(seconds: number): string {
  const normalized = normalizedSeconds(seconds);
  if (normalized < 60) return `${normalized} s`;
  const minutes = Math.floor(normalized / 60);
  const remainder = normalized % 60;
  return remainder === 0 ? `${minutes} min` : `${minutes} min ${remainder} s`;
}
