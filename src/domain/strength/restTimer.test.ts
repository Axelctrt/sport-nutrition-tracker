import {
  adjustRestTimer,
  formatRestDuration,
  formatRestTimer,
  getRestTimerRemainingSeconds,
  pauseRestTimer,
  resumeRestTimer,
  startRestTimer,
  synchronizeRestTimer,
} from '@/domain/strength/restTimer';

const input = {
  sessionId: 'session-1',
  sessionExerciseId: 'exercise-1',
  exerciseName: 'Développé couché',
  durationSeconds: 120,
};

describe('restTimer', () => {
  it('démarre avec un timestamp de fin et recalcule le temps après un passage en arrière-plan', () => {
    const started = startRestTimer(input, 1_000);
    expect(started).toMatchObject({ status: 'running', endAt: 121_000 });
    expect(getRestTimerRemainingSeconds(started, 31_000)).toBe(90);
    expect(synchronizeRestTimer(started, 121_500)).toMatchObject({
      status: 'expired',
      feedbackDelivered: false,
    });
  });

  it('met en pause puis reprend sans perdre le temps restant', () => {
    const started = startRestTimer(input, 0);
    const paused = pauseRestTimer(started, 30_000);
    expect(paused).toMatchObject({ status: 'paused', pausedRemainingSeconds: 90 });

    const resumed = resumeRestTimer(paused, 50_000);
    expect(resumed).toMatchObject({ status: 'running', endAt: 140_000 });
  });

  it('ajoute et retire du temps sans produire une durée négative', () => {
    const started = startRestTimer(input, 0);
    expect(getRestTimerRemainingSeconds(adjustRestTimer(started, 30, 20_000), 20_000)).toBe(130);
    expect(adjustRestTimer(started, -150, 20_000)).toMatchObject({ status: 'expired' });
  });

  it('remplace un minuteur actif au lieu de créer un second minuteur', () => {
    const first = startRestTimer(input, 0);
    const second = startRestTimer({
      ...input,
      sessionExerciseId: 'exercise-2',
      exerciseName: 'Rowing barre',
      durationSeconds: 60,
    }, 10_000);

    expect(first).toMatchObject({ sessionExerciseId: 'exercise-1' });
    expect(second).toMatchObject({
      status: 'running',
      sessionExerciseId: 'exercise-2',
      exerciseName: 'Rowing barre',
      endAt: 70_000,
    });
  });

  it('formate les durées de façon lisible', () => {
    expect(formatRestTimer(125)).toBe('02:05');
    expect(formatRestDuration(45)).toBe('45 s');
    expect(formatRestDuration(120)).toBe('2 min');
    expect(formatRestDuration(135)).toBe('2 min 15 s');
  });
});
